<?php

namespace Database\Factories;

use App\Models\Deck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Card>
 */
class CardFactory extends Factory
{
    public function definition(): array
    {
        return [
            'deck_id' => Deck::factory(),
            'front' => fake()->sentence(),
            'back' => fake()->sentence(),
            'explanation' => fake()->optional()->paragraph(),
            'ease_factor' => 2.50,
            'interval' => 0,
            'repetitions' => 0,
            'due_at' => now(),
            'last_reviewed_at' => null,
        ];
    }
}
