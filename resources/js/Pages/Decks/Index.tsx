import { DECK_COLORS } from '@/Constants/deckColors';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Icon } from '@iconify/react';

type Deck = {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    cards_count: number;
    due_cards_count: number;
};

export default function Index({ decks }: { decks: Deck[] }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                        My Decks
                    </h2>
                    <Link
                        href={route('decks.create')}
                        className="inline-flex items-center rounded-md bg-gray-800 dark:bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white dark:text-gray-900 transition hover:bg-gray-700 dark:hover:bg-white"
                    >
                        New deck
                    </Link>
                </div>
            }
        >
            <Head title="My Decks" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {decks.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {decks.map((deck) => (
                                <DeckCard key={deck.id} deck={deck} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function DeckCard({ deck }: { deck: Deck }) {
    const color =
        DECK_COLORS.find((c) => c.value === deck.color) ?? DECK_COLORS[0];
    const hasCards = deck.cards_count > 0;

    return (
        <Link
            href={route('decks.show', deck.id)}
            className="block overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm transition hover:shadow-md"
        >
            <div className={`h-1 ${color.bg}`} />
            <div className="flex items-start gap-3 p-5">
                <Icon
                    icon={deck.icon ?? 'mdi:book-open-page-variant'}
                    className={`mt-0.5 h-6 w-6 shrink-0 ${color.text}`}
                />
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">
                        {deck.name}
                    </h3>
                    {deck.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                            {deck.description}
                        </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                            {hasCards
                                ? `${deck.cards_count} ${deck.cards_count === 1 ? 'card' : 'cards'}`
                                : 'Empty'}
                        </span>
                        {deck.due_cards_count > 0 && (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                                {deck.due_cards_count} due
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function EmptyState() {
    return (
        <div className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
            <div className="p-12 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    No decks yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                    The only time education sucks is when you sit down to
                    review and don't know where to start.
                </p>
                <Link
                    href={route('decks.create')}
                    className="mt-6 inline-flex items-center rounded-md bg-gray-800 dark:bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white dark:text-gray-900 transition hover:bg-gray-700 dark:hover:bg-white"
                >
                    Create your first deck
                </Link>
            </div>
        </div>
    );
}