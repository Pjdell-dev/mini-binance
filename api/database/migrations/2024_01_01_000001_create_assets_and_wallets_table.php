<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('symbol', 10)->unique();
            $table->string('name', 100);
            $table->integer('precision')->default(8);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('symbol');
            $table->index('is_active');
        });

        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('asset_id')->constrained()->onDelete('cascade');
            $table->decimal('balance_available', 20, 8)->default(0);
            $table->decimal('balance_locked', 20, 8)->default(0);
            $table->timestamps();
            
            $table->unique(['user_id', 'asset_id']);
            $table->index('user_id');
            $table->index('asset_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('assets');
    }
};
