<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KycDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'doc_type',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
        'status',
        'reviewer_id',
        'notes',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function approve(int $reviewerId, ?string $notes = null): bool
    {
        $this->status = 'approved';
        $this->reviewer_id = $reviewerId;
        $this->notes = $notes;
        $this->reviewed_at = now();
        
        return $this->save();
    }

    public function reject(int $reviewerId, string $notes): bool
    {
        $this->status = 'rejected';
        $this->reviewer_id = $reviewerId;
        $this->notes = $notes;
        $this->reviewed_at = now();
        
        return $this->save();
    }
}
