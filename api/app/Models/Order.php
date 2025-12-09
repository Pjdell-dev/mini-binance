<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'market',
        'side',
        'type',
        'price',
        'quantity',
        'quantity_filled',
        'quantity_remaining',
        'status',
        'filled_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:8',
            'quantity' => 'decimal:8',
            'quantity_filled' => 'decimal:8',
            'quantity_remaining' => 'decimal:8',
            'filled_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function buyTrades()
    {
        return $this->hasMany(Trade::class, 'buy_order_id');
    }

    public function sellTrades()
    {
        return $this->hasMany(Trade::class, 'sell_order_id');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, ['open', 'partially_filled']);
    }

    public function isBuy(): bool
    {
        return $this->side === 'buy';
    }

    public function isSell(): bool
    {
        return $this->side === 'sell';
    }

    public function isLimit(): bool
    {
        return $this->type === 'limit';
    }

    public function isMarket(): bool
    {
        return $this->type === 'market';
    }

    public function updateFilled(string $fillAmount): void
    {
        $this->quantity_filled = bcadd($this->quantity_filled, $fillAmount, 8);
        $this->quantity_remaining = bcsub($this->quantity_remaining, $fillAmount, 8);

        if (bccomp($this->quantity_remaining, '0', 8) <= 0) {
            $this->status = 'filled';
            $this->filled_at = now();
        } else {
            $this->status = 'partially_filled';
        }

        $this->save();
    }

    public function cancel(): bool
    {
        if (!$this->isOpen()) {
            return false;
        }

        $this->status = 'cancelled';
        $this->cancelled_at = now();
        
        return $this->save();
    }
}
