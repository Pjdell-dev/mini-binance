<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Asset;
use App\Models\Wallet;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use App\Jobs\ProcessOrderMatching;
use Tests\TestCase;

class OrderTradingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Asset $btc;
    protected Asset $usdt;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test assets
        $this->btc = Asset::factory()->create([
            'symbol' => 'BTC',
            'name' => 'Bitcoin',
            'precision' => 8,
            'is_active' => true
        ]);
        
        $this->usdt = Asset::factory()->create([
            'symbol' => 'USDT',
            'name' => 'Tether',
            'precision' => 2,
            'is_active' => true
        ]);

        // Create user with wallets
        $this->user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Wallet::factory()->create([
            'user_id' => $this->user->id,
            'asset_id' => $this->btc->id,
            'balance_available' => '1.00000000',
            'balance_locked' => '0.00000000',
        ]);

        Wallet::factory()->create([
            'user_id' => $this->user->id,
            'asset_id' => $this->usdt->id,
            'balance_available' => '50000.00',
            'balance_locked' => '0.00',
        ]);
    }

    public function test_user_can_place_limit_buy_order(): void
    {
        Queue::fake();

        $response = $this->actingAs($this->user)
                        ->postJson('/api/orders', [
                            'base' => 'BTC',
                            'quote' => 'USDT',
                            'side' => 'buy',
                            'type' => 'limit',
                            'price' => '40000.00',
                            'quantity' => '0.5',
                        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'message',
                     'order' => ['id', 'side', 'type', 'price', 'quantity', 'status']
                 ]);

        $this->assertDatabaseHas('orders', [
            'user_id' => $this->user->id,
            'side' => 'buy',
            'type' => 'limit',
            'price' => '40000.00000000',
            'quantity' => '0.50000000',
            'status' => 'open',
        ]);

        // Verify funds are locked
        $wallet = Wallet::where('user_id', $this->user->id)
                       ->where('asset_id', $this->usdt->id)
                       ->first();
        
        $this->assertEquals('30000.00', $wallet->balance_available);
        $this->assertEquals('20000.00', $wallet->balance_locked);

        // Verify matching job was dispatched
        Queue::assertPushed(ProcessOrderMatching::class);
    }

    public function test_user_can_place_limit_sell_order(): void
    {
        Queue::fake();

        $response = $this->actingAs($this->user)
                        ->postJson('/api/orders', [
                            'base' => 'BTC',
                            'quote' => 'USDT',
                            'side' => 'sell',
                            'type' => 'limit',
                            'price' => '42000.00',
                            'quantity' => '0.5',
                        ]);

        $response->assertStatus(201);

        // Verify funds are locked
        $wallet = Wallet::where('user_id', $this->user->id)
                       ->where('asset_id', $this->btc->id)
                       ->first();
        
        $this->assertEquals('0.50000000', $wallet->balance_available);
        $this->assertEquals('0.50000000', $wallet->balance_locked);
    }

    public function test_user_cannot_place_order_with_insufficient_balance(): void
    {
        $response = $this->actingAs($this->user)
                        ->postJson('/api/orders', [
                            'base' => 'BTC',
                            'quote' => 'USDT',
                            'side' => 'buy',
                            'type' => 'limit',
                            'price' => '40000.00',
                            'quantity' => '5.0', // Requires 200,000 USDT (more than available)
                        ]);

        $response->assertStatus(400)
                 ->assertJson(['message' => 'Insufficient balance.']);
    }

    public function test_user_can_place_market_order(): void
    {
        Queue::fake();

        $response = $this->actingAs($this->user)
                        ->postJson('/api/orders', [
                            'base' => 'BTC',
                            'quote' => 'USDT',
                            'side' => 'sell',
                            'type' => 'market',
                            'quantity' => '0.1',
                        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('orders', [
            'user_id' => $this->user->id,
            'side' => 'sell',
            'type' => 'market',
            'quantity' => '0.10000000',
        ]);
    }

    public function test_user_can_cancel_open_order(): void
    {
        // Place an order first
        $order = Order::create([
            'user_id' => $this->user->id,
            'market' => 'BTC-USDT',
            'side' => 'buy',
            'type' => 'limit',
            'price' => '40000.00000000',
            'quantity' => '0.50000000',
            'quantity_filled' => '0.00000000',
            'quantity_remaining' => '0.50000000',
            'status' => 'open',
        ]);

        // Lock funds
        $wallet = Wallet::where('user_id', $this->user->id)
                       ->where('asset_id', $this->usdt->id)
                       ->first();
        $wallet->lock('20000.00');

        $response = $this->actingAs($this->user)
                        ->deleteJson("/api/orders/{$order->id}");

        $response->assertStatus(200);

        $order->refresh();
        $this->assertEquals('cancelled', $order->status);

        // Verify funds are unlocked
        $wallet->refresh();
        $this->assertEquals('50000.00', $wallet->balance_available);
        $this->assertEquals('0.00', $wallet->balance_locked);
    }

    public function test_user_cannot_cancel_filled_order(): void
    {
        $order = Order::create([
            'user_id' => $this->user->id,
            'market' => 'BTC-USDT',
            'side' => 'buy',
            'type' => 'limit',
            'price' => '40000.00000000',
            'quantity' => '0.50000000',
            'quantity_filled' => '0.50000000',
            'quantity_remaining' => '0.00000000',
            'status' => 'filled',
        ]);

        $response = $this->actingAs($this->user)
                        ->deleteJson("/api/orders/{$order->id}");

        $response->assertStatus(400)
                 ->assertJson(['message' => 'Only open orders can be cancelled.']);
    }

    public function test_user_can_view_order_history(): void
    {
        // Create some orders
        Order::factory()->count(3)->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)
                        ->getJson('/api/orders/history');

        $response->assertStatus(200)
                 ->assertJsonCount(3, 'orders');
    }

    public function test_user_can_view_open_orders(): void
    {
        Order::factory()->create(['user_id' => $this->user->id, 'status' => 'open']);
        Order::factory()->create(['user_id' => $this->user->id, 'status' => 'open']);
        Order::factory()->create(['user_id' => $this->user->id, 'status' => 'filled']);

        $response = $this->actingAs($this->user)
                        ->getJson('/api/orders/open');

        $response->assertStatus(200)
                 ->assertJsonCount(2, 'orders');
    }

    public function test_order_placement_is_rate_limited(): void
    {
        // Place 11 orders quickly (limit is 10/min)
        for ($i = 0; $i < 11; $i++) {
            $response = $this->actingAs($this->user)
                            ->postJson('/api/orders', [
                                'base' => 'BTC',
                                'quote' => 'USDT',
                                'side' => 'sell',
                                'type' => 'limit',
                                'price' => '40000.00',
                                'quantity' => '0.01',
                            ]);
        }

        // The 11th attempt should be rate limited
        $response->assertStatus(429);
    }
}
