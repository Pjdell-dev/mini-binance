<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class TwoFactorController extends Controller
{
    protected $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    public function enable(Request $request)
    {
        $user = $request->user();

        if ($user->has2FAEnabled()) {
            return response()->json(['message' => '2FA is already enabled.'], 400);
        }

        $secret = $this->google2fa->generateSecretKey();
        
        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        // Generate SVG QR code
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        $qrCode = $writer->writeString($qrCodeUrl);

        // Store secret temporarily in session
        session(['2fa_secret_temp' => $secret]);

        AuditLog::log($user->id, '2fa.enable_initiated', null, null);

        return response()->json([
            'secret' => $secret,
            'qr_code' => $qrCode,
        ]);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $secret = session('2fa_secret_temp');

        if (!$secret) {
            return response()->json(['message' => 'No 2FA setup in progress.'], 400);
        }

        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        // Generate backup codes
        $backupCodes = $this->generateBackupCodes();

        $user->update([
            'mfa_secret' => encrypt($secret),
            'mfa_enabled' => true,
            'backup_codes' => array_map(fn($code) => Hash::make($code), $backupCodes),
        ]);

        session()->forget('2fa_secret_temp');

        AuditLog::log($user->id, '2fa.enabled', User::class, $user->id);

        return response()->json([
            'message' => '2FA enabled successfully.',
            'backup_codes' => $backupCodes,
        ]);
    }

    public function verifyLogin(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $userId = session('2fa:user_id');
        
        if (!$userId) {
            return response()->json(['message' => '2FA verification session expired.'], 400);
        }

        $user = User::findOrFail($userId);

        if (!$user->has2FAEnabled()) {
            return response()->json(['message' => '2FA not enabled for this account.'], 400);
        }

        $secret = decrypt($user->mfa_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code, 2); // 2 = time window

        // If regular code fails, try backup codes
        if (!$valid) {
            $valid = $this->verifyBackupCode($user, $request->code);
        }

        if (!$valid) {
            AuditLog::log($user->id, '2fa.login_failed', User::class, $user->id);
            
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        $remember = session('2fa:remember', false);
        
        Auth::login($user, $remember);
        $request->session()->regenerate();
        
        session()->forget(['2fa:user_id', '2fa:remember']);

        AuditLog::log($user->id, 'auth.login_2fa', User::class, $user->id);

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user->makeVisible(['email_verified_at', 'kyc_status', 'role', 'mfa_enabled']),
        ]);
    }

    public function disable(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Incorrect password.'],
            ]);
        }

        if (!$user->has2FAEnabled()) {
            return response()->json(['message' => '2FA is not enabled.'], 400);
        }

        $secret = decrypt($user->mfa_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        $user->update([
            'mfa_secret' => null,
            'mfa_enabled' => false,
            'backup_codes' => null,
        ]);

        AuditLog::log($user->id, '2fa.disabled', User::class, $user->id);

        return response()->json(['message' => '2FA disabled successfully.']);
    }

    public function regenerateBackupCodes(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (!$user->has2FAEnabled()) {
            return response()->json(['message' => '2FA is not enabled.'], 400);
        }

        $secret = decrypt($user->mfa_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code.'],
            ]);
        }

        $backupCodes = $this->generateBackupCodes();
        
        $user->update([
            'backup_codes' => array_map(fn($code) => Hash::make($code), $backupCodes),
        ]);

        AuditLog::log($user->id, '2fa.backup_codes_regenerated', User::class, $user->id);

        return response()->json([
            'message' => 'Backup codes regenerated.',
            'backup_codes' => $backupCodes,
        ]);
    }

    protected function generateBackupCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(substr(bin2hex(random_bytes(5)), 0, 8));
        }
        return $codes;
    }

    protected function verifyBackupCode($user, string $code): bool
    {
        if (!$user->backup_codes) {
            return false;
        }

        foreach ($user->backup_codes as $index => $hashedCode) {
            if (Hash::check($code, $hashedCode)) {
                // Remove used backup code
                $backupCodes = $user->backup_codes;
                unset($backupCodes[$index]);
                $user->update(['backup_codes' => array_values($backupCodes)]);
                
                AuditLog::log($user->id, '2fa.backup_code_used', User::class, $user->id);
                
                return true;
            }
        }

        return false;
    }
}
