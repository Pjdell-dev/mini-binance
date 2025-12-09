<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Trade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MarketController extends Controller
{
    public function orderbook(Request $request, $base, $quote)
    {
        // Convert path params to market format (BTC/USDT -> BTC-USDT)
        $market = strtoupper($base) . '-' . strtoupper($quote);
        
        $request->validate([
            'depth' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);
        
        if (!in_array($market, ['BTC-USDT', 'ETH-USDT'])) {
            return response()->json(['message' => 'Invalid market'], 400);
        }

        $depth = $request->get('depth', 20);

        // Cache for 1 second to reduce database load
        $cacheKey = "orderbook:{$market}:{$depth}";
        
        $orderbook = Cache::remember($cacheKey, 1, function () use ($market, $depth) {
            $buyOrders = Order::where('market', $market)
                ->where('side', 'buy')
                ->whereIn('status', ['open', 'partially_filled'])
                ->orderBy('price', 'desc')
                ->orderBy('created_at', 'asc')
                ->limit($depth)
                ->get(['price', 'quantity_remaining as quantity'])
                ->groupBy('price')
                ->map(function ($orders) {
                    return [
                        'price' => $orders->first()->price,
                        'quantity' => $orders->sum('quantity'),
                        'total' => bcmul($orders->first()->price, $orders->sum('quantity'), 8),
                    ];
                })
                ->values();

            $sellOrders = Order::where('market', $market)
                ->where('side', 'sell')
                ->whereIn('status', ['open', 'partially_filled'])
                ->orderBy('price', 'asc')
                ->orderBy('created_at', 'asc')
                ->limit($depth)
                ->get(['price', 'quantity_remaining as quantity'])
                ->groupBy('price')
                ->map(function ($orders) {
                    return [
                        'price' => $orders->first()->price,
                        'quantity' => $orders->sum('quantity'),
                        'total' => bcmul($orders->first()->price, $orders->sum('quantity'), 8),
                    ];
                })
                ->values();

            return [
                'bids' => $buyOrders,
                'asks' => $sellOrders,
            ];
        });

        return response()->json([
            'market' => $market,
            'orderbook' => $orderbook,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function recentTrades(Request $request, $base, $quote)
    {
        // Convert path params to market format (BTC/USDT -> BTC-USDT)
        $market = strtoupper($base) . '-' . strtoupper($quote);
        
        $request->validate([
            'limit' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);
        
        if (!in_array($market, ['BTC-USDT', 'ETH-USDT'])) {
            return response()->json(['message' => 'Invalid market'], 400);
        }

        $limit = $request->get('limit', 50);

        $trades = Trade::where('market', $market)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get(['price', 'quantity', 'created_at']);

        return response()->json([
            'market' => $market,
            'trades' => $trades,
        ]);
    }

    public function ticker(Request $request, $base, $quote)
    {
        // Convert path params to market format (BTC/USDT -> BTC-USDT)
        $market = strtoupper($base) . '-' . strtoupper($quote);
        
        if (!in_array($market, ['BTC-USDT', 'ETH-USDT'])) {
            return response()->json(['message' => 'Invalid market'], 400);
        }

        // Cache for 5 seconds
        $cacheKey = "ticker:{$market}";
        
        $ticker = Cache::remember($cacheKey, 5, function () use ($market) {
            // Last trade price
            $lastTrade = Trade::where('market', $market)
                ->orderBy('created_at', 'desc')
                ->first();

            // 24h statistics
            $dayAgo = now()->subDay();
            
            $trades24h = Trade::where('market', $market)
                ->where('created_at', '>=', $dayAgo)
                ->get();

            $highPrice = $trades24h->max('price') ?? '0';
            $lowPrice = $trades24h->min('price') ?? '0';
            $volume = $trades24h->sum('quantity') ?? '0';
            
            // Opening price (first trade 24h ago)
            $openPrice = Trade::where('market', $market)
                ->where('created_at', '>=', $dayAgo)
                ->orderBy('created_at', 'asc')
                ->value('price') ?? '0';

            $lastPrice = $lastTrade ? $lastTrade->price : '0';
            
            // Calculate change
            $priceChange = bccomp($openPrice, '0', 8) !== 0
                ? bcsub($lastPrice, $openPrice, 8)
                : '0';
                
            $priceChangePercent = bccomp($openPrice, '0', 8) !== 0
                ? bcmul(bcdiv($priceChange, $openPrice, 10), '100', 2)
                : '0';

            return [
                'last_price' => $lastPrice,
                'open_price' => $openPrice,
                'high_price' => $highPrice,
                'low_price' => $lowPrice,
                'volume_24h' => $volume,
                'price_change' => $priceChange,
                'price_change_percent' => $priceChangePercent,
            ];
        });

        return response()->json([
            'market' => $market,
            'ticker' => $ticker,
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
