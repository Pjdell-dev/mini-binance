<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Auth\Notifications\VerifyEmail as VerifyEmailNotification;
use Illuminate\Support\Facades\URL;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, SoftDeletes, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'mfa_secret',
        'mfa_enabled',
        'backup_codes',
        'kyc_status',
        'role',
        'is_frozen',
        'frozen_reason',
        'frozen_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
        'backup_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'mfa_enabled' => 'boolean',
            'backup_codes' => 'array',
            'is_frozen' => 'boolean',
            'frozen_at' => 'datetime',
        ];
    }

    // Relationships
    public function wallets()
    {
        return $this->hasMany(Wallet::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function kycDocuments()
    {
        return $this->hasMany(KycDocument::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'actor_user_id');
    }

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isFrozen(): bool
    {
        return $this->is_frozen;
    }

    public function hasVerifiedEmail(): bool
    {
        return !is_null($this->email_verified_at);
    }

    public function has2FAEnabled(): bool
    {
        return $this->mfa_enabled && !is_null($this->mfa_secret);
    }

    public function isKycApproved(): bool
    {
        return $this->kyc_status === 'approved';
    }

    /**
     * Send the email verification notification with correct URL.
     */
    public function sendEmailVerificationNotification()
    {
        // Force URL generation to use localhost instead of docker service name
        URL::forceRootUrl('http://localhost');
        
        $this->notify(new VerifyEmailNotification);
    }
}
