<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deck_id')->constrained()->cascadeOnDelete();
            $table->text('front');
            $table->text('back');
            $table->text('explanation')->nullable();

            // SM-2 scheduling state
            $table->decimal('ease_factor', 4, 2)->default(2.50);
            $table->unsignedInteger('interval')->default(0);
            $table->unsignedInteger('repetitions')->default(0);
            $table->timestamp('due_at')->nullable();
            $table->timestamp('last_reviewed_at')->nullable();

            $table->timestamps();

            $table->index(['deck_id', 'due_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};
