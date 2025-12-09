<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Transaction;
use App\Models\Asset;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $transactions = Transaction::with(['asset', 'approver'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['transactions' => $transactions]);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        
        $transaction = Transaction::with(['asset', 'approver'])
            ->where('user_id', $user->id)
            ->findOrFail($id);

        return response()->json(['transaction' => $transaction]);
    }

    public function deposit(Request $request)
    {
        $request->validate([
            'asset_symbol' => ['required', 'string', 'exists:assets,symbol'],
            'amount' => ['required', 'numeric', 'min:0.00000001'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        
        if ($user->isFrozen()) {
            return response()->json(['message' => 'Account is frozen.'], 403);
        }

        $asset = Asset::where('symbol', strtoupper($request->asset_symbol))->firstOrFail();

        $transaction = Transaction::create([
            'user_id' => $user->id,
            'asset_id' => $asset->id,
            'type' => 'deposit',
            'amount' => $request->amount,
            'status' => 'pending',
            'notes' => $request->notes,
        ]);

        AuditLog::log($user->id, 'transaction.deposit_requested', Transaction::class, $transaction->id, [
            'asset' => $asset->symbol,
            'amount' => $request->amount,
        ]);

        return response()->json([
            'message' => 'Deposit request submitted successfully.',
            'transaction' => $transaction->load('asset'),
        ], 201);
    }

    public function withdraw(Request $request)
    {
        $request->validate([
            'asset_symbol' => ['required', 'string', 'exists:assets,symbol'],
            'amount' => ['required', 'numeric', 'min:0.00000001'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        
        if ($user->isFrozen()) {
            return response()->json(['message' => 'Account is frozen.'], 403);
        }

        $asset = Asset::where('symbol', strtoupper($request->asset_symbol))->firstOrFail();
        
        $wallet = Wallet::where('user_id', $user->id)
            ->where('asset_id', $asset->id)
            ->firstOrFail();

        // Check sufficient balance
        if (bccomp($wallet->balance_available, $request->amount, 8) < 0) {
            return response()->json(['message' => 'Insufficient balance.'], 400);
        }

        DB::beginTransaction();
        
        try {
            // Lock funds
            $wallet->lockFunds($request->amount);

            $transaction = Transaction::create([
                'user_id' => $user->id,
                'asset_id' => $asset->id,
                'type' => 'withdraw',
                'amount' => $request->amount,
                'status' => 'pending',
                'notes' => $request->notes,
            ]);

            AuditLog::log($user->id, 'transaction.withdraw_requested', Transaction::class, $transaction->id, [
                'asset' => $asset->symbol,
                'amount' => $request->amount,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Withdrawal request submitted successfully.',
                'transaction' => $transaction->load('asset'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
