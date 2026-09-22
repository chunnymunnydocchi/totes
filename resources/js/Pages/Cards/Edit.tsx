import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CardForm from '@/Pages/Cards/Partials/CardForm';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Card = {
    id: number;
    front: string;
    back: string;
    explanation: string | null;
};

type Deck = {
    id: number;
    name: string;
};

export default function Edit({ card, deck }: { card: Card; deck: Deck }) {
    const form = useForm({
        front: card.front,
        back: card.back,
        explanation: card.explanation ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(route('cards.update', card.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                    Edit card in {deck.name}
                </h2>
            }
        >
            <Head title={`Edit card in ${deck.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white dark:bg-gray-800 p-6 shadow-sm sm:rounded-lg">
                        <CardForm
                            form={form}
                            submitLabel="Save changes"
                            onSubmit={submit}
                            cancelHref={route('decks.show', deck.id)}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}