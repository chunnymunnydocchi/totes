<?php

namespace Tests\Feature\Decks;

use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeckFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_factory_creates_a_persisted_deck(): void
    {
        $deck = Deck::factory()->create();

        $this->assertNotNull($deck->id);
        $this->assertDatabaseHas('decks', ['id' => $deck->id]);
    }

    public function test_the_factory_creates_a_user_if_one_is_not_given(): void
    {
        $deck = Deck::factory()->create();

        $this->assertNotNull($deck->user_id);
        $this->assertNotNull($deck->user);
        $this->assertInstanceOf(User::class, $deck->user);
    }

    public function test_the_factory_respects_a_given_user(): void
    {
        $user = User::factory()->create();

        $deck = Deck::factory()->for($user)->create();

        $this->assertSame($user->id, $deck->user_id);
        $this->assertSame(1, User::count());
    }

    public function test_the_factory_color_is_always_in_the_palette(): void
    {
        $palette = ['blue', 'purple', 'green', 'amber', 'rose', 'teal', 'indigo', 'slate'];

        for ($i = 0; $i < 20; $i++) {
            $deck = Deck::factory()->create();
            $this->assertContains($deck->color, $palette);
        }
    }

    public function test_the_factory_icon_matches_the_shape_the_form_request_accepts(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $deck = Deck::factory()->create();
            $this->assertMatchesRegularExpression(
                '/^[a-z0-9-]+:[a-z0-9-]+$/i',
                $deck->icon,
            );
        }
    }
}
