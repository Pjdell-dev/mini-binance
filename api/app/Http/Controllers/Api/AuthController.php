<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Asset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised() // Check against Have I Been Pwned database
            ],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
        ]);

        // Create wallets for all active assets
        $assets = Asset::where('is_active', true)->get();
        foreach ($assets as $asset) {
            Wallet::create([
                'user_id' => $user->id,
                'asset_id' => $asset->id,
                'balance_available' => '0',
                'balance_locked' => '0',
            ]);
        }

        event(new Registered($user));

        AuditLog::log($user->id, 'user.register', User::class, $user->id);

        return response()->json([
            'message' => 'Registration successful. Please verify your email.',
            'user' => $user->only(['id', 'name', 'email']),
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AuditLog::log(null, 'auth.login_failed', null, null, ['email' => $request->email]);
            
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->isFrozen()) {
            AuditLog::log($user->id, 'auth.login_frozen', User::class, $user->id);
            
            throw ValidationException::withMessages([
                'email' => ['This account has been frozen. Please contact support.'],
            ]);
        }

        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email before logging in.',
                'requires_verification' => true,
            ], 403);
        }

        if ($user->has2FAEnabled()) {
            // Store pending 2FA session
            session([
                '2fa:user_id' => $user->id,
                '2fa:remember' => $request->filled('remember'),
            ]);

            return response()->json([
                'message' => '2FA verification required.',
                'requires_2fa' => true,
            ]);
        }

        Auth::login($user, $request->filled('remember'));
        $request->session()->regenerate();

        AuditLog::log($user->id, 'auth.login', User::class, $user->id);

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user->makeVisible(['email_verified_at', 'kyc_status', 'role', 'mfa_enabled']),
        ]);
    }

    public function logout(Request $request)
    {
        $user = Auth::user();
        
        if ($user) {
            AuditLog::log($user->id, 'auth.logout', User::class, $user->id);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => $user->makeVisible(['email_verified_at', 'kyc_status', 'role', 'mfa_enabled']),
        ]);
    }

    public function verifyEmail(Request $request, $id, $hash)
    {
        $user = User::findOrFail($id);

        if (!hash_equals((string) $hash, sha1($user->email))) {
            return response()->json(['message' => 'Invalid verification link.'], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        AuditLog::log($user->id, 'auth.email_verified', User::class, $user->id);

        return response()->json(['message' => 'Email verified successfully.']);
    }

    public function resendVerification(Request $request)
    {
        $request->validate(['email' => ['required', 'email', 'exists:users']]);

        $user = User::where('email', $request->email)->firstOrFail();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email sent.']);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Password reset link sent to your email.']);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised() // Check against Have I Been Pwned database
            ],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();

                AuditLog::log($user->id, 'auth.password_reset', User::class, $user->id);
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successful.']);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols()
                ->uncompromised() // Check against Have I Been Pwned database
            ],
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match your current password.'],
            ]);
        }

        // Update password
        $user->password = Hash::make($request->password);
        $user->save();

        AuditLog::log($user->id, 'auth.password_changed', User::class, $user->id);

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
