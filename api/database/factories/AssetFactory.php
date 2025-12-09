<?php

namespace Database\Factories;

use App\Models\Asset;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition(): array
    {
        return [
            'symbol' => strtoupper($this->faker->unique()->lexify('???')),
            'name' => $this->faker->currencyCode() . ' Coin',
            'precision' => 8,
            'is_active' => true,
        ];
    }
}
