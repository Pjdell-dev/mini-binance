<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\Asset;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $wallets = Wallet::with('asset')
            ->where('user_id', $user->id)
            ->get()
            ->map(function ($wallet) {
                return [
                    'id' => $wallet->id,
                    'asset' => [
                        'id' => $wallet->asset->id,
                        'symbol' => $wallet->asset->symbol,
                        'name' => $wallet->asset->name,
                        'precision' => $wallet->asset->precision,
                    ],
                    'balance_available' => $wallet->balance_available,
                    'balance_locked' => $wallet->balance_locked,
                    'balance_total' => $wallet->total_balance,
                ];
            });

        return response()->json(['wallets' => $wallets]);
    }

    public function show(Request $request, $assetSymbol)
    {
        $user = $request->user();
        
        $asset = Asset::where('symbol', strtoupper($assetSymbol))->firstOrFail();
        
        $wallet = Wallet::with('asset')
            ->where('user_id', $user->id)
            ->where('asset_id', $asset->id)
            ->firstOrFail();

        return response()->json([
            'wallet' => [
                'id' => $wallet->id,
                'asset' => [
                    'id' => $wallet->asset->id,
                    'symbol' => $wallet->asset->symbol,
                    'name' => $wallet->asset->name,
                    'precision' => $wallet->asset->precision,
                ],
                'balance_available' => $wallet->balance_available,
                'balance_locked' => $wallet->balance_locked,
                'balance_total' => $wallet->total_balance,
            ],
        ]);
    }
}
