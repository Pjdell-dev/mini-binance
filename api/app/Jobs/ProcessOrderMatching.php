<?php

namespace App\Jobs;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Trade;
use App\Models\Wallet;
use App\Models\Asset;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessOrderMatching implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 90;

    protected $orderId;

    public function __construct(int $orderId)
    {
        $this->orderId = $orderId;
    }

    public function handle(): void
    {
        DB::transaction(function () {
            $order = Order::lockForUpdate()->find($this->orderId);

            if (!$order || !$order->isOpen()) {
                return;
            }

            // Parse market
            [$baseSymbol, $quoteSymbol] = explode('-', $order->market);
            
            $baseAsset = Asset::where('symbol', $baseSymbol)->firstOrFail();
            $quoteAsset = Asset::where('symbol', $quoteSymbol)->firstOrFail();

            // Get opposite side orders
            $oppositeSide = $order->side === 'buy' ? 'sell' : 'buy';
            
            $oppositeOrders = Order::where('market', $order->market)
                ->where('side', $oppositeSide)
                ->whereIn('status', ['open', 'partially_filled'])
                ->where('user_id', '!=', $order->user_id) // Can't match with own orders
                ->lockForUpdate()
                ->orderBy('price', $oppositeSide === 'buy' ? 'desc' : 'asc')
                ->orderBy('created_at', 'asc')
                ->get();

            foreach ($oppositeOrders as $oppositeOrder) {
                if (bccomp($order->quantity_remaining, '0', 8) <= 0) {
                    break;
                }

                // Check price match
                if ($order->isLimit() && $oppositeOrder->isLimit()) {
                    $priceMatches = $order->isBuy()
                        ? bccomp($order->price, $oppositeOrder->price, 8) >= 0
                        : bccomp($order->price, $oppositeOrder->price, 8) <= 0;

                    if (!$priceMatches) {
                        continue;
                    }
                }

                // Execute trade
                $this->executeTrade($order, $oppositeOrder, $baseAsset, $quoteAsset);
            }

            // If market order not fully filled, cancel remainder
            if ($order->isMarket() && bccomp($order->quantity_remaining, '0', 8) > 0) {
                $this->releaseLockedFunds($order, $baseAsset, $quoteAsset);
                $order->status = 'cancelled';
                $order->cancelled_at = now();
                $order->save();
            }
        });
    }

    protected function executeTrade(Order $takerOrder, Order $makerOrder, Asset $baseAsset, Asset $quoteAsset): void
    {
        // Match quantity
        $tradeQuantity = bccomp($takerOrder->quantity_remaining, $makerOrder->quantity_remaining, 8) <= 0
            ? $takerOrder->quantity_remaining
            : $makerOrder->quantity_remaining;

        // Price is maker's price (price-time priority)
        $tradePrice = $makerOrder->price;
        $tradeTotal = bcmul($tradeQuantity, $tradePrice, 8);

        // Determine buy/sell orders
        $buyOrder = $takerOrder->isBuy() ? $takerOrder : $makerOrder;
        $sellOrder = $takerOrder->isSell() ? $takerOrder : $makerOrder;

        // Get wallets
        $buyerQuoteWallet = Wallet::where('user_id', $buyOrder->user_id)
            ->where('asset_id', $quoteAsset->id)
            ->lockForUpdate()
            ->firstOrFail();

        $buyerBaseWallet = Wallet::where('user_id', $buyOrder->user_id)
            ->where('asset_id', $baseAsset->id)
            ->lockForUpdate()
            ->firstOrFail();

        $sellerBaseWallet = Wallet::where('user_id', $sellOrder->user_id)
            ->where('asset_id', $baseAsset->id)
            ->lockForUpdate()
            ->firstOrFail();

        $sellerQuoteWallet = Wallet::where('user_id', $sellOrder->user_id)
            ->where('asset_id', $quoteAsset->id)
            ->lockForUpdate()
            ->firstOrFail();

        // Execute transfers
        // Buyer: deduct locked quote, credit base
        $buyerQuoteWallet->deductLocked($tradeTotal);
        $buyerBaseWallet->credit($tradeQuantity);

        // Seller: deduct locked base, credit quote
        $sellerBaseWallet->deductLocked($tradeQuantity);
        $sellerQuoteWallet->credit($tradeTotal);

        // Create trade record
        $trade = Trade::create([
            'buy_order_id' => $buyOrder->id,
            'sell_order_id' => $sellOrder->id,
            'taker_user_id' => $takerOrder->user_id,
            'maker_user_id' => $makerOrder->user_id,
            'market' => $takerOrder->market,
            'price' => $tradePrice,
            'quantity' => $tradeQuantity,
            'total' => $tradeTotal,
        ]);

        // Update orders
        $takerOrder->updateFilled($tradeQuantity);
        $makerOrder->updateFilled($tradeQuantity);

        // Audit logs
        AuditLog::log($takerOrder->user_id, 'trade.executed', Trade::class, $trade->id, [
            'market' => $takerOrder->market,
            'side' => $takerOrder->side,
            'price' => $tradePrice,
            'quantity' => $tradeQuantity,
            'role' => 'taker',
        ]);

        AuditLog::log($makerOrder->user_id, 'trade.executed', Trade::class, $trade->id, [
            'market' => $makerOrder->market,
            'side' => $makerOrder->side,
            'price' => $tradePrice,
            'quantity' => $tradeQuantity,
            'role' => 'maker',
        ]);

        Log::info("Trade executed", [
            'trade_id' => $trade->id,
            'market' => $trade->market,
            'price' => $tradePrice,
            'quantity' => $tradeQuantity,
        ]);
    }

    protected function releaseLockedFunds(Order $order, Asset $baseAsset, Asset $quoteAsset): void
    {
        if (bccomp($order->quantity_remaining, '0', 8) <= 0) {
            return;
        }

        if ($order->isBuy()) {
            $asset = $quoteAsset;
            $amount = bcmul($order->quantity_remaining, $order->price, 8);
        } else {
            $asset = $baseAsset;
            $amount = $order->quantity_remaining;
        }

        $wallet = Wallet::where('user_id', $order->user_id)
            ->where('asset_id', $asset->id)
            ->lockForUpdate()
            ->firstOrFail();

        $wallet->unlockFunds($amount);
    }
}
