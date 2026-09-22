import { DECK_COLORS } from '@/Constants/deckColors';
import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Icon } from '@iconify/react';
import { useState } from 'react';

type Deck = {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    cards_count: number;
    due_cards_count: number;
};

type CardType = {
    id: number;
    front: string;
    back: string;
    explanation: string | null;
    due_at: string | null;
    repetitions: number;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

export default function Show({
    deck,
    cards,
}: {
    deck: Deck;
    cards: Paginated<CardType>;
}) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [confirmingDeleteCard, setConfirmingDeleteCard] =
        useState<CardType | null>(null);
    const color =
        DECK_COLORS.find((c) => c.value === deck.color) ?? DECK_COLORS[0];

    const deleteDeck = () => {
        router.delete(route('decks.destroy', deck.id), {
            onFinish: () => setConfirmingDelete(false),
        });
    };

    const deleteCard = () => {
        if (!confirmingDeleteCard) return;
        router.delete(route('cards.destroy', confirmingDeleteCard.id), {
            onFinish: () => setConfirmingDeleteCard(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon
                            icon={deck.icon ?? 'mdi:book-open-page-variant'}
                            className={`h-6 w-6 ${color.text}`}
                        />
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                            {deck.name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('decks.edit', deck.id)}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            Edit
                        </Link>
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={deck.name} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {deck.description && (
                        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm sm:rounded-lg sm:p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {deck.description}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Stat label="Total cards" value={deck.cards_count} />
                        <Stat label="Due now" value={deck.due_cards_count} />
                        <Stat label="Mastered" value={0} />
                        <Stat label="Last studied" value="Never" />
                    </div>

                    <div className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                Cards
                            </h3>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={route('cards.create', deck.id)}
                                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Add card
                                </Link>
                                <button
                                    type="button"
                                    disabled
                                    title="Available on Day 4"
                                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500"
                                >
                                    Generate with AI
                                </button>
                            </div>
                        </div>

                        {cards.data.length === 0 ? (
                            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                No cards yet. Generate a batch from your notes,
                                or add one manually.
                            </div>
                        ) : (
                            <>
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {cards.data.map((card) => (
                                        <li
                                            key={card.id}
                                            className="flex items-center justify-between gap-4 p-4"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                                                    {card.front}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDue(card.due_at)}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3">
                                                <Link
                                                    href={route(
                                                        'cards.edit',
                                                        card.id,
                                                    )}
                                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmingDeleteCard(
                                                            card,
                                                        )
                                                    }
                                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                {cards.last_page > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 p-4 text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            Page {cards.current_page} of{' '}
                                            {cards.last_page}
                                        </span>
                                        <div className="flex gap-2">
                                            {cards.links.map((link, i) => (
                                                <Link
                                                    key={i}
                                                    href={link.url ?? '#'}
                                                    preserveScroll
                                                    className={
                                                        'rounded-md px-3 py-1 ' +
                                                        (link.active
                                                            ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900'
                                                            : link.url
                                                                ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed')
                                                    }
                                                    dangerouslySetInnerHTML={{
                                                        __html: link.label,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                show={confirmingDelete}
                onClose={() => setConfirmingDelete(false)}
                maxWidth="md"
            >
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Delete &ldquo;{deck.name}&rdquo;?
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        This will also delete {deck.cards_count} cards and all
                        their review history. This cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton
                            onClick={() => setConfirmingDelete(false)}
                            autoFocus
                        >
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={deleteDeck}>
                            Delete deck
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            <Modal
                show={confirmingDeleteCard !== null}
                onClose={() => setConfirmingDeleteCard(null)}
                maxWidth="md"
            >
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Delete this card?
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        &ldquo;{confirmingDeleteCard?.front.slice(0, 60)}
                        {confirmingDeleteCard &&
                            confirmingDeleteCard.front.length > 60
                            ? '…'
                            : ''}
                        &rdquo; — This will also delete its review history. This
                        cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton
                            onClick={() => setConfirmingDeleteCard(null)}
                            autoFocus
                        >
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={deleteCard}>
                            Delete card
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

function formatDue(dueAt: string | null): string {
    if (!dueAt) return 'Not scheduled';

    const due = new Date(dueAt);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();

    if (diffMs <= 0) return 'Due now';

    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `Due in ${diffMinutes}m`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Due in ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `In ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {value}
            </div>
        </div>
    );
}