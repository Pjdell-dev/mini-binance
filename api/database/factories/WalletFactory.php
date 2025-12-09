<?php

namespace Database\Factories;

use App\Models\Wallet;
use App\Models\User;
use App\Models\Asset;
use Illuminate\Database\Eloquent\Factories\Factory;

class WalletFactory extends Factory
{
    protected $model = Wallet::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'asset_id' => Asset::factory(),
            'balance_available' => '1000.00000000',
            'balance_locked' => '0.00000000',
        ];
    }
}
