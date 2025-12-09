<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'asset_id',
        'balance_available',
        'balance_locked',
    ];

    protected function casts(): array
    {
        return [
            'balance_available' => 'decimal:8',
            'balance_locked' => 'decimal:8',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function getTotalBalanceAttribute(): string
    {
        return bcadd($this->balance_available, $this->balance_locked, 8);
    }

    public function lockFunds(string $amount): bool
    {
        if (bccomp($this->balance_available, $amount, 8) < 0) {
            return false;
        }

        $this->balance_available = bcsub($this->balance_available, $amount, 8);
        $this->balance_locked = bcadd($this->balance_locked, $amount, 8);
        
        return $this->save();
    }

    public function unlockFunds(string $amount): bool
    {
        if (bccomp($this->balance_locked, $amount, 8) < 0) {
            return false;
        }

        $this->balance_locked = bcsub($this->balance_locked, $amount, 8);
        $this->balance_available = bcadd($this->balance_available, $amount, 8);
        
        return $this->save();
    }

    public function deductLocked(string $amount): bool
    {
        if (bccomp($this->balance_locked, $amount, 8) < 0) {
            return false;
        }

        $this->balance_locked = bcsub($this->balance_locked, $amount, 8);
        
        return $this->save();
    }

    public function credit(string $amount): bool
    {
        $this->balance_available = bcadd($this->balance_available, $amount, 8);
        
        return $this->save();
    }
}
