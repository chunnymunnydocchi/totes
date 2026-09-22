import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export type CardFormData = {
    front: string;
    back: string;
    explanation: string;
};

export type CardFormApi = {
    data: CardFormData;
    setData: <K extends keyof CardFormData>(
        key: K,
        value: CardFormData[K],
    ) => void;
    errors: Partial<Record<keyof CardFormData, string>>;
    processing: boolean;
};

type Props = {
    form: CardFormApi;
    submitLabel: string;
    onSubmit: FormEventHandler;
    cancelHref: string;
};

export default function CardForm({
    form,
    submitLabel,
    onSubmit,
    cancelHref,
}: Props) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <InputLabel htmlFor="front" value="Front (the question)" />
                <textarea
                    id="front"
                    value={form.data.front}
                    onChange={(e) => form.setData('front', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={3}
                    placeholder="What is the derivative of ln(x)?"
                    autoFocus
                />
                <InputError message={form.errors.front} className="mt-2" />
            </div>

            <div>
                <InputLabel htmlFor="back" value="Back (the answer)" />
                <textarea
                    id="back"
                    value={form.data.back}
                    onChange={(e) => form.setData('back', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={3}
                    placeholder="1/x"
                />
                <InputError message={form.errors.back} className="mt-2" />
            </div>

            <div>
                <InputLabel
                    htmlFor="explanation"
                    value="Explanation (optional)"
                />
                <textarea
                    id="explanation"
                    value={form.data.explanation}
                    onChange={(e) =>
                        form.setData('explanation', e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={2}
                    placeholder="Why is this the answer?"
                />
                <InputError
                    message={form.errors.explanation}
                    className="mt-2"
                />
            </div>

            <div className="flex items-center gap-3">
                <PrimaryButton disabled={form.processing}>
                    {submitLabel}
                </PrimaryButton>
                <Link
                    href={cancelHref}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}