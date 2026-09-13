<?php

namespace Tests\Feature\Decks;

use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeckCrudTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_the_deck_index(): void
    {
        $this->get('/decks')->assertRedirect('/login');
    }

    public function test_a_user_sees_only_their_own_decks(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Deck::factory()->for($user)->create(['name' => 'Mine']);
        Deck::factory()->for($other)->create(['name' => 'Theirs']);

        $response = $this->actingAs($user)->get('/decks');

        $response->assertOk();
        $response->assertInertia(
            fn($page) => $page
                ->component('Decks/Index')
                ->has('decks', 1)
                ->where('decks.0.name', 'Mine')
        );
    }

    public function test_a_user_can_create_a_deck(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/decks', [
            'name' => 'Physics',
            'description' => 'Chapter 3',
            'icon' => 'mdi:atom',
            'color' => 'blue',
            'shuffle_default' => true,
        ]);

        $deck = Deck::firstOrFail();
        $response->assertRedirect(route('decks.show', $deck));

        $this->assertSame($user->id, $deck->user_id);
        $this->assertSame('Physics', $deck->name);
        $this->assertTrue($deck->shuffle_default);
    }

    public function test_creating_a_deck_rejects_a_malformed_icon(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/decks', [
            'name' => 'Physics',
            'icon' => 'not a valid icon name',
            'color' => 'blue',
            'shuffle_default' => false,
        ]);

        $response->assertSessionHasErrors('icon');
        $this->assertSame(0, Deck::count());
    }

    public function test_creating_a_deck_rejects_an_unknown_color(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/decks', [
            'name' => 'Physics',
            'icon' => 'mdi:atom',
            'color' => 'chartreuse',
            'shuffle_default' => false,
        ]);

        $response->assertSessionHasErrors('color');
        $this->assertSame(0, Deck::count());
    }

    public function test_creating_a_deck_accepts_a_well_shaped_icon_not_in_the_curated_list(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/decks', [
            'name' => 'Physics',
            'icon' => 'simple-icons:some-not-curated-icon',
            'color' => 'blue',
            'shuffle_default' => false,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertSame(1, Deck::count());
    }

    public function test_a_user_cannot_view_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->get(route('decks.show', $deck))
            ->assertNotFound();
    }

    public function test_a_user_cannot_edit_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->get(route('decks.edit', $deck))
            ->assertNotFound();
    }

    public function test_a_user_cannot_update_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->put(route('decks.update', $deck), [
                'name' => 'Hijacked',
                'icon' => 'mdi:atom',
                'color' => 'blue',
                'shuffle_default' => false,
            ])
            ->assertNotFound();

        $this->assertNotSame('Hijacked', $deck->fresh()->name);
    }

    public function test_a_user_can_update_their_own_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create(['name' => 'Old']);

        $this->actingAs($user)
            ->put(route('decks.update', $deck), [
                'name' => 'New',
                'icon' => 'mdi:atom',
                'color' => 'purple',
                'shuffle_default' => false,
            ])
            ->assertRedirect(route('decks.show', $deck));

        $deck->refresh();
        $this->assertSame('New', $deck->name);
        $this->assertSame('purple', $deck->color);
    }

    public function test_a_user_cannot_delete_another_users_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->create();

        $this->actingAs($user)
            ->delete(route('decks.destroy', $deck))
            ->assertNotFound();

        $this->assertNotNull($deck->fresh());
    }

    public function test_a_user_can_delete_their_own_deck(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('decks.destroy', $deck))
            ->assertRedirect(route('decks.index'));

        $this->assertNull($deck->fresh());
    }

    public function test_a_user_can_change_their_theme(): void
    {
        $user = User::factory()->create(['theme' => 'system']);

        $this->actingAs($user)
            ->patch(route('settings.appearance.update'), ['theme' => 'dark'])
            ->assertRedirect();

        $this->assertSame('dark', $user->fresh()->theme);
    }

    public function test_the_theme_endpoint_rejects_invalid_values(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('settings.appearance.update'), ['theme' => 'sepia'])
            ->assertSessionHasErrors('theme');

        $this->assertSame('system', $user->fresh()->theme);
    }

    public function test_guests_cannot_change_a_theme(): void
    {
        $this->patch(route('settings.appearance.update'), ['theme' => 'dark'])
            ->assertRedirect('/login');
    }
}
