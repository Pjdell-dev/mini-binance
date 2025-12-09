<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'asset_id',
        'type',
        'amount',
        'status',
        'approved_by',
        'rejection_reason',
        'approved_at',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:8',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
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

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isDeposit(): bool
    {
        return $this->type === 'deposit';
    }

    public function isWithdraw(): bool
    {
        return $this->type === 'withdraw';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function approve(int $approverId): bool
    {
        $this->status = 'approved';
        $this->approved_by = $approverId;
        $this->approved_at = now();
        
        return $this->save();
    }

    public function reject(int $approverId, string $reason): bool
    {
        $this->status = 'rejected';
        $this->approved_by = $approverId;
        $this->rejection_reason = $reason;
        $this->approved_at = now();
        
        return $this->save();
    }

    public function complete(): bool
    {
        $this->status = 'completed';
        $this->completed_at = now();
        
        return $this->save();
    }
}
