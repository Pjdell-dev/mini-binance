<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create assets
        $btc = Asset::create([
            'symbol' => 'BTC',
            'name' => 'Bitcoin',
            'precision' => 8,
            'is_active' => true,
        ]);

        $eth = Asset::create([
            'symbol' => 'ETH',
            'name' => 'Ethereum',
            'precision' => 8,
            'is_active' => true,
        ]);

        $usdt = Asset::create([
            'symbol' => 'USDT',
            'name' => 'Tether USD',
            'precision' => 8,
            'is_active' => true,
        ]);

        // Admin user
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@minibinance.local',
            'password' => Hash::make('Admin@12345678'),
            'email_verified_at' => now(),
            'role' => 'admin',
            'kyc_status' => 'approved',
        ]);

        $this->createWallets($admin, [$btc, $eth, $usdt]);

        // Regular user with 2FA
        $user2fa = User::create([
            'name' => 'User With 2FA',
            'email' => 'user2fa@minibinance.local',
            'password' => Hash::make('User2FA@12345678'),
            'email_verified_at' => now(),
            'role' => 'user',
            'kyc_status' => 'approved',
            'mfa_enabled' => false, // Will enable on first login
        ]);

        $this->createWallets($user2fa, [$btc, $eth, $usdt]);
        $this->seedDemoBalance($user2fa, $btc, '0.5');
        $this->seedDemoBalance($user2fa, $eth, '5.0');
        $this->seedDemoBalance($user2fa, $usdt, '10000.0');

        // Frozen user
        $frozenUser = User::create([
            'name' => 'Frozen User',
            'email' => 'frozen@minibinance.local',
            'password' => Hash::make('Frozen@12345678'),
            'email_verified_at' => now(),
            'role' => 'user',
            'kyc_status' => 'approved',
            'is_frozen' => true,
            'frozen_reason' => 'Suspicious activity detected - Demo account',
            'frozen_at' => now(),
        ]);

        $this->createWallets($frozenUser, [$btc, $eth, $usdt]);
        $this->seedDemoBalance($frozenUser, $usdt, '5000.0');

        // Additional demo users
        for ($i = 1; $i <= 5; $i++) {
            $demoUser = User::create([
                'name' => "Demo User {$i}",
                'email' => "demo{$i}@minibinance.local",
                'password' => Hash::make("Demo{$i}@12345678"),
                'email_verified_at' => now(),
                'role' => 'user',
                'kyc_status' => $i % 3 === 0 ? 'approved' : 'none',
            ]);

            $this->createWallets($demoUser, [$btc, $eth, $usdt]);
            
            // Give some demo balance
            $this->seedDemoBalance($demoUser, $btc, (string)(0.1 * $i));
            $this->seedDemoBalance($demoUser, $eth, (string)(1.0 * $i));
            $this->seedDemoBalance($demoUser, $usdt, (string)(1000.0 * $i));
        }

        echo "\n✅ Database seeded successfully!\n\n";
        echo "📧 Test Accounts:\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "👤 Admin Account:\n";
        echo "   Email: admin@minibinance.local\n";
        echo "   Password: Admin@12345678\n\n";
        echo "👤 User with 2FA (to be enabled):\n";
        echo "   Email: user2fa@minibinance.local\n";
        echo "   Password: User2FA@12345678\n\n";
        echo "🔒 Frozen User:\n";
        echo "   Email: frozen@minibinance.local\n";
        echo "   Password: Frozen@12345678\n\n";
        echo "👥 Demo Users 1-5:\n";
        echo "   Email: demo[1-5]@minibinance.local\n";
        echo "   Password: Demo[1-5]@12345678\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    }

    protected function createWallets(User $user, array $assets): void
    {
        foreach ($assets as $asset) {
            Wallet::create([
                'user_id' => $user->id,
                'asset_id' => $asset->id,
                'balance_available' => '0',
                'balance_locked' => '0',
            ]);
        }
    }

    protected function seedDemoBalance(User $user, Asset $asset, string $amount): void
    {
        $wallet = Wallet::where('user_id', $user->id)
            ->where('asset_id', $asset->id)
            ->first();

        if ($wallet) {
            $wallet->update(['balance_available' => $amount]);
        }
    }
}
