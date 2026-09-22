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

export default function Show({ deck }: { deck: Deck }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const color =
        DECK_COLORS.find((c) => c.value === deck.color) ?? DECK_COLORS[0];

    const deleteDeck = () => {
        router.delete(route('decks.destroy', deck.id), {
            onFinish: () => setConfirmingDelete(false),
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
                                <button
                                    type="button"
                                    disabled
                                    title="Available on Day 3"
                                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500"
                                >
                                    Add card
                                </button>
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
                        <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
                            No cards yet. Generate a batch from your notes, or
                            add one manually.
                        </div>
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
        </AuthenticatedLayout>
    );
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