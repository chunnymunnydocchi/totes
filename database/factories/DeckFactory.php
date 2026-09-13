<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Deck>
 */
class DeckFactory extends Factory
{
    private const ICON_POOL = [
        'mdi:book-open-page-variant',
        'mdi:atom',
        'mdi:flask',
        'mdi:brain',
        'mdi:palette',
        'mdi:code-tags',
        'mdi:earth',
        'mdi:music',
    ];

    private const COLOR_POOL = [
        'blue',
        'purple',
        'green',
        'amber',
        'rose',
        'teal',
        'indigo',
        'slate',
    ];

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'icon' => fake()->randomElement(self::ICON_POOL),
            'color' => fake()->randomElement(self::COLOR_POOL),
            'shuffle_default' => false,
        ];
    }
}
