import { DEFAULT_DECK_COLOR } from '@/Constants/deckColors';
import { DEFAULT_DECK_ICON } from '@/Constants/deckIcons';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeckForm from '@/Pages/Decks/Partials/DeckForm';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Create() {
    const form = useForm({
        name: '',
        description: '',
        icon: DEFAULT_DECK_ICON,
        color: DEFAULT_DECK_COLOR as string,
        shuffle_default: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('decks.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Create a deck
                </h2>
            }
        >
            <Head title="Create a deck" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <DeckForm
                            form={form}
                            submitLabel="Create deck"
                            onSubmit={submit}
                            cancelHref={route('decks.index')}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}