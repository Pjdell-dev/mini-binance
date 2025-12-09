<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\KycDocument;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Asset;
use App\Models\Order;
use App\Models\Trade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    // User Management
    public function users(Request $request)
    {
        $users = User::withCount(['orders', 'transactions'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        // Transform user data to match frontend expectations
        $users->getCollection()->transform(function ($user) {
            $user->two_factor_enabled = $user->mfa_enabled;
            $user->kyc_verified_at = $user->kyc_status === 'approved' ? $user->updated_at : null;
            return $user;
        });

        return response()->json(['users' => $users]);
    }

    public function showUser(Request $request, $id)
    {
        $user = User::with(['wallets.asset', 'kycDocuments'])
            ->withCount(['orders', 'transactions'])
            ->findOrFail($id);

        // Transform user data to match frontend expectations
        $user->two_factor_enabled = $user->mfa_enabled;
        $user->kyc_verified_at = $user->kyc_status === 'approved' ? $user->updated_at : null;

        return response()->json(['user' => $user]);
    }

    public function freezeUser(Request $request, $id)
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        $user = User::findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Cannot freeze admin accounts.'], 403);
        }

        if ($user->isFrozen()) {
            return response()->json(['message' => 'User is already frozen.'], 400);
        }

        $user->update([
            'is_frozen' => true,
            'frozen_reason' => $request->reason,
            'frozen_at' => now(),
        ]);

        AuditLog::log($admin->id, 'admin.user_frozen', User::class, $user->id, [
            'reason' => $request->reason,
        ]);

        return response()->json([
            'message' => 'User frozen successfully.',
            'user' => $user,
        ]);
    }

    public function unfreezeUser(Request $request, $id)
    {
        $admin = $request->user();
        $user = User::findOrFail($id);

        if (!$user->isFrozen()) {
            return response()->json(['message' => 'User is not frozen.'], 400);
        }

        $user->update([
            'is_frozen' => false,
            'frozen_reason' => null,
            'frozen_at' => null,
        ]);

        AuditLog::log($admin->id, 'admin.user_unfrozen', User::class, $user->id);

        return response()->json([
            'message' => 'User unfrozen successfully.',
            'user' => $user,
        ]);
    }

    public function grantAdmin(Request $request, $id)
    {
        $admin = $request->user();
        $user = User::findOrFail($id);

        if ($user->is_admin) {
            return response()->json(['message' => 'User is already an admin.'], 400);
        }

        $user->update(['is_admin' => true]);

        AuditLog::log($admin->id, 'admin.grant_admin_role', User::class, $user->id);

        return response()->json([
            'message' => 'Admin role granted successfully.',
            'user' => $user,
        ]);
    }

    public function revokeAdmin(Request $request, $id)
    {
        $admin = $request->user();
        $user = User::findOrFail($id);

        if (!$user->is_admin) {
            return response()->json(['message' => 'User is not an admin.'], 400);
        }

        // Prevent self-revocation
        if ($user->id === $admin->id) {
            return response()->json(['message' => 'You cannot revoke your own admin role.'], 403);
        }

        $user->update(['is_admin' => false]);

        AuditLog::log($admin->id, 'admin.revoke_admin_role', User::class, $user->id);

        return response()->json([
            'message' => 'Admin role revoked successfully.',
            'user' => $user,
        ]);
    }

    // KYC Management
    public function pendingKyc(Request $request)
    {
        $status = $request->query('status', 'pending');

        $query = KycDocument::with('user')->orderBy('created_at', 'desc');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $documents = $query->paginate(20);

        return response()->json(['documents' => $documents]);
    }

    public function approveKyc(Request $request, $id)
    {
        $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        $document = KycDocument::with('user')->findOrFail($id);

        if (!$document->isPending()) {
            return response()->json(['message' => 'Document has already been reviewed.'], 400);
        }

        DB::beginTransaction();

        try {
            $document->approve($admin->id, $request->notes);

            // Update user KYC status
            $document->user->update(['kyc_status' => 'approved']);

            AuditLog::log($admin->id, 'admin.kyc_approved', KycDocument::class, $document->id, [
                'user_id' => $document->user_id,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'KYC document approved.',
                'document' => $document,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function rejectKyc(Request $request, $id)
    {
        $request->validate([
            'notes' => ['required', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        $document = KycDocument::with('user')->findOrFail($id);

        if (!$document->isPending()) {
            return response()->json(['message' => 'Document has already been reviewed.'], 400);
        }

        DB::beginTransaction();

        try {
            $document->reject($admin->id, $request->notes);

            // Update user KYC status
            $document->user->update(['kyc_status' => 'rejected']);

            AuditLog::log($admin->id, 'admin.kyc_rejected', KycDocument::class, $document->id, [
                'user_id' => $document->user_id,
                'reason' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'KYC document rejected.',
                'document' => $document,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function viewKycDocument(Request $request, $id)
    {
        $document = KycDocument::findOrFail($id);

        if (!Storage::exists($document->file_path)) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        AuditLog::log($request->user()->id, 'admin.kyc_document_viewed', KycDocument::class, $document->id);

        return Storage::download($document->file_path, $document->file_name);
    }

    // Transaction Management
    public function pendingTransactions(Request $request)
    {
        $query = Transaction::with(['user', 'asset'])
            ->orderBy('created_at', 'desc');

        // Filter by status if provided
        if ($request->has('status') && $request->status !== 'all') {
            // Treat 'approved' as both 'approved' and 'completed'
            if ($request->status === 'approved') {
                $query->whereIn('status', ['approved', 'completed']);
            } else {
                $query->where('status', $request->status);
            }
        }

        $transactions = $query->paginate(50);

        return response()->json(['transactions' => $transactions]);
    }

    public function approveTransaction(Request $request, $id)
    {
        $admin = $request->user();
        $transaction = Transaction::with(['user', 'asset'])->findOrFail($id);

        if (!$transaction->isPending()) {
            return response()->json(['message' => 'Transaction has already been processed.'], 400);
        }

        DB::beginTransaction();

        try {
            $transaction->approve($admin->id);

            $wallet = Wallet::where('user_id', $transaction->user_id)
                ->where('asset_id', $transaction->asset_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($transaction->isDeposit()) {
                // Credit wallet
                $wallet->credit($transaction->amount);
            } else {
                // Withdraw: funds already locked, deduct locked funds
                $wallet->deductLocked($transaction->amount);
            }

            $transaction->complete();

            AuditLog::log($admin->id, 'admin.transaction_approved', Transaction::class, $transaction->id, [
                'user_id' => $transaction->user_id,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'asset' => $transaction->asset->symbol,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Transaction approved.',
                'transaction' => $transaction,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function rejectTransaction(Request $request, $id)
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        $transaction = Transaction::with(['user', 'asset'])->findOrFail($id);

        if (!$transaction->isPending()) {
            return response()->json(['message' => 'Transaction has already been processed.'], 400);
        }

        DB::beginTransaction();

        try {
            $transaction->reject($admin->id, $request->reason);

            // If withdrawal, release locked funds
            if ($transaction->isWithdraw()) {
                $wallet = Wallet::where('user_id', $transaction->user_id)
                    ->where('asset_id', $transaction->asset_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $wallet->unlockFunds($transaction->amount);
            }

            AuditLog::log($admin->id, 'admin.transaction_rejected', Transaction::class, $transaction->id, [
                'user_id' => $transaction->user_id,
                'type' => $transaction->type,
                'amount' => $transaction->amount,
                'asset' => $transaction->asset->symbol,
                'reason' => $request->reason,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Transaction rejected.',
                'transaction' => $transaction,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Wallet Management
    public function creditWallet(Request $request)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'asset_symbol' => ['required', 'exists:assets,symbol'],
            'amount' => ['required', 'numeric', 'min:0.00000001'],
            'notes' => ['required', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        $user = User::findOrFail($request->user_id);
        $asset = Asset::where('symbol', strtoupper($request->asset_symbol))->firstOrFail();

        DB::beginTransaction();

        try {
            $wallet = Wallet::where('user_id', $user->id)
                ->where('asset_id', $asset->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->credit($request->amount);

            AuditLog::log($admin->id, 'admin.wallet_credited', Wallet::class, $wallet->id, [
                'user_id' => $user->id,
                'asset' => $asset->symbol,
                'amount' => $request->amount,
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Wallet credited successfully.',
                'wallet' => $wallet->load('asset'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function debitWallet(Request $request)
    {
        $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'asset_symbol' => ['required', 'exists:assets,symbol'],
            'amount' => ['required', 'numeric', 'min:0.00000001'],
            'notes' => ['required', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        $user = User::findOrFail($request->user_id);
        $asset = Asset::where('symbol', strtoupper($request->asset_symbol))->firstOrFail();

        DB::beginTransaction();

        try {
            $wallet = Wallet::where('user_id', $user->id)
                ->where('asset_id', $asset->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (bccomp($wallet->balance_available, $request->amount, 8) < 0) {
                return response()->json(['message' => 'Insufficient balance.'], 400);
            }

            $wallet->balance_available = bcsub($wallet->balance_available, $request->amount, 8);
            $wallet->save();

            AuditLog::log($admin->id, 'admin.wallet_debited', Wallet::class, $wallet->id, [
                'user_id' => $user->id,
                'asset' => $asset->symbol,
                'amount' => $request->amount,
                'notes' => $request->notes,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Wallet debited successfully.',
                'wallet' => $wallet->load('asset'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Audit Logs
    public function auditLogs(Request $request)
    {
        $logs = AuditLog::with('actor')
            ->orderBy('created_at', 'desc')
            ->paginate(100);

        return response()->json(['logs' => $logs]);
    }

    // Statistics
    public function stats(Request $request)
    {
        $stats = [
            'total_users' => User::count(),
            'active_users' => User::where('email_verified_at', '!=', null)->count(),
            'frozen_users' => User::where('is_frozen', true)->count(),
            'pending_kyc' => KycDocument::where('status', 'pending')->count(),
            'approved_kyc' => KycDocument::where('status', 'approved')->count(),
            'pending_transactions' => Transaction::where('status', 'pending')->count(),
            'total_orders' => Order::count(),
            'open_orders' => Order::whereIn('status', ['open', 'partially_filled'])->count(),
            'total_trades' => Trade::count(),
            'trades_24h' => Trade::where('created_at', '>=', now()->subDay())->count(),
        ];

        return response()->json(['stats' => $stats]);
    }
}
