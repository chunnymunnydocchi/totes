<?php

namespace Tests\Feature\Cards;

use App\Models\Card;
use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_the_card_create_form(): void
    {
        $deck = Deck::factory()->create();

        $this->get(route('cards.create', $deck))->assertRedirect('/login');
    }

    public function test_a_user_can_view_the_create_form_for_their_own_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create(['name' => 'Physics']);

        $this->actingAs($user)
            ->get(route('cards.create', $deck))
            ->assertOk()
            ->assertInertia(
                fn($page) => $page
                    ->component('Cards/Create')
                    ->where('deck.id', $deck->id)
                    ->where('deck.name', 'Physics')
            );
    }

    public function test_a_user_cannot_view_the_create_form_for_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->get(route('cards.create', $deck))
            ->assertNotFound();
    }

    public function test_a_user_can_create_a_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('cards.store', $deck), [
            'front' => 'What is the derivative of ln(x)?',
            'back' => '1/x',
            'explanation' => 'Standard calculus result.',
        ]);

        $response->assertRedirect(route('cards.create', $deck));

        $card = Card::firstOrFail();
        $this->assertSame($deck->id, $card->deck_id);
        $this->assertSame('What is the derivative of ln(x)?', $card->front);
        $this->assertNotNull($card->due_at);
        $this->assertSame(2.5, $card->ease_factor);
        $this->assertSame(0, $card->repetitions);
    }

    public function test_creating_a_card_requires_front_and_back(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('cards.store', $deck), [
            'explanation' => 'No front or back.',
        ]);

        $response->assertSessionHasErrors(['front', 'back']);
        $this->assertSame(0, Card::count());
    }

    public function test_creating_a_card_rejects_overly_long_fields(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('cards.store', $deck), [
            'front' => str_repeat('a', 2001),
            'back' => 'ok',
        ]);

        $response->assertSessionHasErrors('front');
        $this->assertSame(0, Card::count());
    }

    public function test_a_user_cannot_create_a_card_in_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->post(route('cards.store', $deck), [
                'front' => 'Hijacked',
                'back' => 'No',
            ])
            ->assertNotFound();

        $this->assertSame(0, Card::count());
    }

    public function test_a_user_can_edit_their_own_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create(['front' => 'Old']);

        $this->actingAs($user)
            ->get(route('cards.edit', $card))
            ->assertOk()
            ->assertInertia(
                fn($page) => $page
                    ->component('Cards/Edit')
                    ->where('card.front', 'Old')
                    ->where('deck.id', $deck->id)
            );
    }

    public function test_a_user_cannot_edit_another_users_card(): void
    {
        $user = User::factory()->create();
        $card = Card::factory()->create();

        $this->actingAs($user)
            ->get(route('cards.edit', $card))
            ->assertNotFound();
    }

    public function test_a_user_can_update_their_own_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create(['front' => 'Old']);

        $this->actingAs($user)
            ->put(route('cards.update', $card), [
                'front' => 'New',
                'back' => 'Answer',
                'explanation' => null,
            ])
            ->assertRedirect(route('decks.show', $deck));

        $this->assertSame('New', $card->fresh()->front);
    }

    public function test_updating_a_card_does_not_reset_scheduling_state(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create([
            'repetitions' => 5,
            'interval' => 30,
            'ease_factor' => 2.30,
        ]);

        $this->actingAs($user)->put(route('cards.update', $card), [
            'front' => 'Edited',
            'back' => 'Answer',
        ]);

        $card->refresh();
        $this->assertSame(5, $card->repetitions);
        $this->assertSame(30, $card->interval);
        $this->assertSame(2.3, $card->ease_factor);
    }

    public function test_a_user_cannot_update_another_users_card(): void
    {
        $user = User::factory()->create();
        $card = Card::factory()->create(['front' => 'Original']);

        $this->actingAs($user)
            ->put(route('cards.update', $card), [
                'front' => 'Hijacked',
                'back' => 'No',
            ])
            ->assertNotFound();

        $this->assertSame('Original', $card->fresh()->front);
    }

    public function test_a_user_can_delete_their_own_card(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($deck)->create();

        $this->actingAs($user)
            ->delete(route('cards.destroy', $card))
            ->assertRedirect(route('decks.show', $deck));

        $this->assertNull($card->fresh());
    }

    public function test_a_user_cannot_delete_another_users_card(): void
    {
        $user = User::factory()->create();
        $card = Card::factory()->create();

        $this->actingAs($user)
            ->delete(route('cards.destroy', $card))
            ->assertNotFound();

        $this->assertNotNull($card->fresh());
    }

    public function test_deleting_a_deck_cascades_to_its_cards(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        Card::factory()->for($deck)->count(3)->create();

        $this->assertSame(3, Card::count());

        $deck->delete();

        $this->assertSame(0, Card::count());
    }
}
