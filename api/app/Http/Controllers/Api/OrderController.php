<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessOrderMatching;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Trade;
use App\Models\Wallet;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function place(Request $request)
    {
        $request->validate([
            'market' => ['required', 'string', 'in:BTC-USDT,ETH-USDT'],
            'side' => ['required', 'in:buy,sell'],
            'type' => ['required', 'in:limit,market'],
            'price' => ['required_if:type,limit', 'nullable', 'numeric', 'min:0.00000001'],
            'quantity' => ['required', 'numeric', 'min:0.00000001'],
        ]);

        $user = $request->user();

        if ($user->isFrozen()) {
            return response()->json(['message' => 'Account is frozen.'], 403);
        }

        // Parse market (e.g., BTC-USDT)
        [$baseSymbol, $quoteSymbol] = explode('-', $request->market);

        $baseAsset = Asset::where('symbol', $baseSymbol)->firstOrFail();
        $quoteAsset = Asset::where('symbol', $quoteSymbol)->firstOrFail();

        $side = $request->side;
        $type = $request->type;
        $price = $type === 'market' ? null : $request->price;
        $quantity = $request->quantity;

        // Calculate required balance
        if ($side === 'buy') {
            // Buying base asset with quote asset
            $requiredAsset = $quoteAsset;
            $requiredAmount = $type === 'market'
                ? bcmul($quantity, $this->getMarketPrice($request->market, 'sell'), 8)
                : bcmul($quantity, $price, 8);
        } else {
            // Selling base asset
            $requiredAsset = $baseAsset;
            $requiredAmount = $quantity;
        }

        $wallet = Wallet::where('user_id', $user->id)
            ->where('asset_id', $requiredAsset->id)
            ->lockForUpdate()
            ->firstOrFail();

        if (bccomp($wallet->balance_available, $requiredAmount, 8) < 0) {
            return response()->json(['message' => 'Insufficient balance.'], 400);
        }

        DB::beginTransaction();

        try {
            // Lock funds
            $wallet->lockFunds($requiredAmount);

            // Create order
            $order = Order::create([
                'user_id' => $user->id,
                'market' => $request->market,
                'side' => $side,
                'type' => $type,
                'price' => $price,
                'quantity' => $quantity,
                'quantity_filled' => '0',
                'quantity_remaining' => $quantity,
                'status' => 'open',
            ]);

            AuditLog::log($user->id, 'order.placed', Order::class, $order->id, [
                'market' => $request->market,
                'side' => $side,
                'type' => $type,
                'price' => $price,
                'quantity' => $quantity,
            ]);

            DB::commit();

            // Dispatch matching job
            ProcessOrderMatching::dispatch($order->id);

            return response()->json([
                'message' => 'Order placed successfully.',
                'order' => $order,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function cancel(Request $request, $id)
    {
        $user = $request->user();

        $order = Order::where('user_id', $user->id)
            ->findOrFail($id);

        if (!$order->isOpen()) {
            return response()->json(['message' => 'Order cannot be cancelled.'], 400);
        }

        DB::beginTransaction();

        try {
            // Parse market
            [$baseSymbol, $quoteSymbol] = explode('-', $order->market);

            $baseAsset = Asset::where('symbol', $baseSymbol)->first();
            $quoteAsset = Asset::where('symbol', $quoteSymbol)->first();

            // Calculate locked amount to release
            if ($order->isBuy()) {
                $asset = $quoteAsset;
                $amount = bcmul($order->quantity_remaining, $order->price, 8);
            } else {
                $asset = $baseAsset;
                $amount = $order->quantity_remaining;
            }

            // Release funds
            $wallet = Wallet::where('user_id', $user->id)
                ->where('asset_id', $asset->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->unlockFunds($amount);

            // Cancel order
            $order->cancel();

            AuditLog::log($user->id, 'order.cancelled', Order::class, $order->id);

            DB::commit();

            return response()->json([
                'message' => 'Order cancelled successfully.',
                'order' => $order,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function openOrders(Request $request)
    {
        $user = $request->user();

        $orders = Order::where('user_id', $user->id)
            ->whereIn('status', ['open', 'partially_filled'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                [$base, $quote] = explode('-', $order->market);
                return [
                    'id' => $order->id,
                    'base_asset_symbol' => $base,
                    'quote_asset_symbol' => $quote,
                    'side' => $order->side,
                    'type' => $order->type,
                    'price' => $order->price,
                    'quantity' => $order->quantity,
                    'quantity_filled' => $order->quantity_filled,
                    'status' => $order->status,
                    'created_at' => $order->created_at,
                ];
            });

        return response()->json(['data' => $orders]);
    }

    public function orderHistory(Request $request)
    {
        $user = $request->user();

        $orders = Order::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        $transformedOrders = $orders->getCollection()->map(function ($order) {
            [$base, $quote] = explode('-', $order->market);
            return [
                'id' => $order->id,
                'base_asset_symbol' => $base,
                'quote_asset_symbol' => $quote,
                'side' => $order->side,
                'type' => $order->type,
                'price' => $order->price,
                'quantity' => $order->quantity,
                'quantity_filled' => $order->quantity_filled,
                'status' => $order->status,
                'created_at' => $order->created_at,
            ];
        });

        $orders->setCollection($transformedOrders);

        return response()->json(['data' => $orders]);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();

        $order = Order::with(['buyTrades', 'sellTrades'])
            ->where('user_id', $user->id)
            ->findOrFail($id);

        return response()->json(['order' => $order]);
    }

    public function portfolio(Request $request)
    {
        $user = $request->user();

        $wallets = Wallet::with('asset')
            ->where('user_id', $user->id)
            ->get();

        $openOrders = Order::where('user_id', $user->id)
            ->whereIn('status', ['open', 'partially_filled'])
            ->get();

        $recentTrades = Trade::where('taker_user_id', $user->id)
            ->orWhere('maker_user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'wallets' => $wallets,
            'open_orders' => $openOrders,
            'recent_trades' => $recentTrades,
        ]);
    }

    protected function getMarketPrice(string $market, string $side): string
    {
        // Get best available price from order book
        $order = Order::where('market', $market)
            ->where('side', $side)
            ->whereIn('status', ['open', 'partially_filled'])
            ->orderBy('price', $side === 'buy' ? 'desc' : 'asc')
            ->first();

        return $order ? $order->price : '0';
    }
}
