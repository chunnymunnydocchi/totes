<?php

namespace Tests\Feature\Cards;

use App\Models\Card;
use App\Models\Deck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_factory_creates_a_card_with_a_parent_deck(): void
    {
        $card = Card::factory()->create();

        $this->assertNotNull($card->deck);
        $this->assertInstanceOf(Deck::class, $card->deck);
    }

    public function test_the_factory_defaults_to_a_due_card(): void
    {
        $card = Card::factory()->create();

        $this->assertTrue($card->isDue());
    }

    public function test_the_factory_defaults_to_sm2_initial_state(): void
    {
        $card = Card::factory()->create();

        $this->assertSame(2.5, $card->ease_factor);
        $this->assertSame(0, $card->interval);
        $this->assertSame(0, $card->repetitions);
        $this->assertNull($card->last_reviewed_at);
    }
}
