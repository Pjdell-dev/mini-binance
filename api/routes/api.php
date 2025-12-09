<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\MarketController;
use App\Http\Controllers\Api\KycController;
use App\Http\Controllers\Api\AdminController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

// Sanctum CSRF cookie endpoint (with /api prefix)
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show'])->name('sanctum.csrf-cookie');

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/logout', [AuthController::class, 'logout']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/verify-email/resend', [AuthController::class, 'resendVerification']);
Route::get('/auth/verify-email/{id}/{hash}', [AuthController::class, 'verifyEmail'])->name('verification.verify');

// 2FA Login
Route::post('/auth/2fa/verify-login', [TwoFactorController::class, 'verifyLogin'])->middleware('throttle:otp');

// Market data (public)
Route::get('/market/orderbook/{base}/{quote}', [MarketController::class, 'orderbook']);
Route::get('/market/trades/{base}/{quote}', [MarketController::class, 'recentTrades']);
Route::get('/market/ticker/{base}/{quote}', [MarketController::class, 'ticker']);

// Protected routes
Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    // User profile
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me', [AuthController::class, 'updateProfile']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    
    // 2FA Management
    Route::prefix('2fa')->group(function () {
        Route::post('/enable', [TwoFactorController::class, 'enable']);
        Route::post('/verify', [TwoFactorController::class, 'verify'])->middleware('throttle:otp');
        Route::post('/disable', [TwoFactorController::class, 'disable'])->middleware('throttle:otp');
        Route::post('/backup-codes', [TwoFactorController::class, 'regenerateBackupCodes'])->middleware('throttle:otp');
    });
    
    // Wallets
    Route::get('/wallets', [WalletController::class, 'index']);
    Route::get('/wallets/{symbol}', [WalletController::class, 'show']);
    
    // Transactions
    Route::prefix('transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::post('/deposit', [TransactionController::class, 'deposit']);
        Route::post('/withdraw', [TransactionController::class, 'withdraw'])->middleware(['2fa', 'throttle:withdrawals']);
        Route::get('/{id}', [TransactionController::class, 'show']);
    });
    
    // Orders
    Route::prefix('orders')->group(function () {
        Route::get('/portfolio', [OrderController::class, 'portfolio']);
        Route::get('/open', [OrderController::class, 'openOrders']);
        Route::get('/history', [OrderController::class, 'orderHistory']);
        Route::post('/', [OrderController::class, 'place'])->middleware('throttle:orders');
        Route::delete('/{id}', [OrderController::class, 'cancel']);
        Route::get('/{id}', [OrderController::class, 'show']);
    });
    
    // KYC
    Route::prefix('kyc')->group(function () {
        Route::post('/submit', [KycController::class, 'submit']);
        Route::get('/status', [KycController::class, 'status']);
        Route::get('/documents', [KycController::class, 'documents']);
    });
});

// Admin routes
Route::middleware(['auth:sanctum', 'verified', 'admin'])->prefix('admin')->group(function () {
    // User management
    Route::get('/users', [AdminController::class, 'users']);
    Route::get('/users/{id}', [AdminController::class, 'showUser']);
    Route::post('/users/{id}/freeze', [AdminController::class, 'freezeUser']);
    Route::post('/users/{id}/unfreeze', [AdminController::class, 'unfreezeUser']);
    Route::post('/users/{id}/grant-admin', [AdminController::class, 'grantAdmin']);
    Route::post('/users/{id}/revoke-admin', [AdminController::class, 'revokeAdmin']);
    
    // KYC management
    Route::get('/kyc/documents', [AdminController::class, 'pendingKyc']); // Supports ?status=pending/approved/rejected/all
    Route::get('/kyc/pending', [AdminController::class, 'pendingKyc']); // Legacy endpoint
    Route::post('/kyc/{id}/approve', [AdminController::class, 'approveKyc']);
    Route::post('/kyc/{id}/reject', [AdminController::class, 'rejectKyc']);
    Route::get('/kyc/{id}/document', [AdminController::class, 'viewKycDocument']);
    
    // Transaction management
    Route::get('/transactions/pending', [AdminController::class, 'pendingTransactions']);
    Route::post('/transactions/{id}/approve', [AdminController::class, 'approveTransaction']);
    Route::post('/transactions/{id}/reject', [AdminController::class, 'rejectTransaction']);
    
    // Wallet management
    Route::post('/wallets/credit', [AdminController::class, 'creditWallet']);
    Route::post('/wallets/debit', [AdminController::class, 'debitWallet']);
    
    // Audit logs
    Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
    
    // Statistics
    Route::get('/stats', [AdminController::class, 'stats']);
});
