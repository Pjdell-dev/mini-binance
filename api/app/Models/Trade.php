<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Trade extends Model
{
    use HasFactory;

    protected $fillable = [
        'buy_order_id',
        'sell_order_id',
        'taker_user_id',
        'maker_user_id',
        'market',
        'price',
        'quantity',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:8',
            'quantity' => 'decimal:8',
            'total' => 'decimal:8',
        ];
    }

    public function buyOrder()
    {
        return $this->belongsTo(Order::class, 'buy_order_id');
    }

    public function sellOrder()
    {
        return $this->belongsTo(Order::class, 'sell_order_id');
    }

    public function takerUser()
    {
        return $this->belongsTo(User::class, 'taker_user_id');
    }

    public function makerUser()
    {
        return $this->belongsTo(User::class, 'maker_user_id');
    }
}
