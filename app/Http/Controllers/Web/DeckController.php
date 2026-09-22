<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeckRequest;
use App\Http\Requests\UpdateDeckRequest;
use App\Models\Deck;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeckController extends Controller
{
    public function index(Request $request): Response
    {
        $decks = $request->user()
            ->decks()
            ->withCount(['cards', 'dueCards'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Decks/Index', [
            'decks' => $decks,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Decks/Create');
    }

    public function store(StoreDeckRequest $request): RedirectResponse
    {
        $deck = $request->user()->decks()->create($request->validated());

        return redirect()->route('decks.show', $deck);
    }

    public function show(Request $request, Deck $deck): Response
    {
        abort_unless($request->user()->can('view', $deck), 404);

        $deck->loadCount(['cards', 'dueCards']);

        $cards = $deck->cards()
            ->orderBy('due_at')
            ->paginate(20);

        return Inertia::render('Decks/Show', [
            'deck' => $deck,
            'cards' => $cards,
        ]);
    }

    public function edit(Request $request, Deck $deck): Response
    {
        abort_unless($request->user()->can('update', $deck), 404);

        return Inertia::render('Decks/Edit', [
            'deck' => $deck,
        ]);
    }

    public function update(UpdateDeckRequest $request, Deck $deck): RedirectResponse
    {
        abort_unless($request->user()->can('update', $deck), 404);

        $deck->update($request->validated());

        return redirect()->route('decks.show', $deck);
    }

    public function destroy(Request $request, Deck $deck): RedirectResponse
    {
        abort_unless($request->user()->can('delete', $deck), 404);

        $deck->delete();

        return redirect()->route('decks.index');
    }
}
