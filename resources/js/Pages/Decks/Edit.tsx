import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeckForm from '@/Pages/Decks/Partials/DeckForm';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Deck = {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    shuffle_default: boolean;
};

export default function Edit({ deck }: { deck: Deck }) {
    const form = useForm({
        name: deck.name,
        description: deck.description ?? '',
        icon: deck.icon ?? 'mdi:book-open-page-variant',
        color: deck.color as string,
        shuffle_default: deck.shuffle_default,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(route('decks.update', deck.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Edit deck
                </h2>
            }
        >
            <Head title={`Edit ${deck.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <DeckForm
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