<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('market', 20); // e.g., BTC-USDT
            $table->enum('side', ['buy', 'sell']);
            $table->enum('type', ['limit', 'market']);
            $table->decimal('price', 20, 8)->nullable(); // nullable for market orders
            $table->decimal('quantity', 20, 8);
            $table->decimal('quantity_filled', 20, 8)->default(0);
            $table->decimal('quantity_remaining', 20, 8);
            $table->enum('status', ['open', 'partially_filled', 'filled', 'cancelled', 'rejected'])->default('open');
            $table->timestamp('filled_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            
            $table->index(['market', 'status', 'created_at']);
            $table->index(['user_id', 'status']);
            $table->index(['market', 'side', 'price', 'created_at']); // For order book queries
        });

        Schema::create('trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buy_order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('sell_order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('taker_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('maker_user_id')->constrained('users')->onDelete('cascade');
            $table->string('market', 20);
            $table->decimal('price', 20, 8);
            $table->decimal('quantity', 20, 8);
            $table->decimal('total', 20, 8);
            $table->timestamps();
            
            $table->index(['market', 'created_at']);
            $table->index('taker_user_id');
            $table->index('maker_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trades');
        Schema::dropIfExists('orders');
    }
};
