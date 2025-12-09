<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $quantity = $this->faker->randomFloat(8, 0.01, 10);
        $quantityFilled = $this->faker->boolean(30) ? $this->faker->randomFloat(8, 0, $quantity) : '0.00000000';
        
        return [
            'user_id' => User::factory(),
            'market' => $this->faker->randomElement(['BTC-USDT', 'ETH-USDT', 'BTC-ETH']),
            'side' => $this->faker->randomElement(['buy', 'sell']),
            'type' => $this->faker->randomElement(['limit', 'market']),
            'price' => $this->faker->randomFloat(8, 100, 50000),
            'quantity' => number_format($quantity, 8, '.', ''),
            'quantity_filled' => $quantityFilled,
            'quantity_remaining' => number_format($quantity - $quantityFilled, 8, '.', ''),
            'status' => $this->faker->randomElement(['open', 'filled', 'cancelled', 'partially_filled']),
        ];
    }

    public function open()
    {
        return $this->state(function (array $attributes) {
            $quantity = $attributes['quantity'];
            return [
                'status' => 'open',
                'quantity_filled' => '0.00000000',
                'quantity_remaining' => $quantity,
            ];
        });
    }

    public function filled()
    {
        return $this->state(function (array $attributes) {
            $quantity = $attributes['quantity'];
            return [
                'status' => 'filled',
                'quantity_filled' => $quantity,
                'quantity_remaining' => '0.00000000',
            ];
        });
    }
}
