import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CardForm from '@/Pages/Cards/Partials/CardForm';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Deck = {
    id: number;
    name: string;
};

export default function Create({
    deck,
    flash,
}: {
    deck: Deck;
    flash: { success?: string | null };
}) {
    const form = useForm({
        front: '',
        back: '',
        explanation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('cards.store', deck.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                    Add a card to {deck.name}
                </h2>
            }
        >
            <Head title={`Add a card to ${deck.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        {flash?.success && (
                            <div className="mb-4 rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
                                {flash.success}
                            </div>
                        )}
                        <CardForm
                            form={form}
                            submitLabel="Add card"
                            onSubmit={submit}
                            cancelHref={route('decks.show', deck.id)}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}