import ColorPicker from '@/Components/ColorPicker';
import IconPicker from '@/Components/IconPicker';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export type DeckFormData = {
    name: string;
    description: string;
    icon: string;
    color: string;
    shuffle_default: boolean;
};

export type DeckFormApi = {
    data: DeckFormData;
    setData: <K extends keyof DeckFormData>(key: K, value: DeckFormData[K]) => void;
    errors: Partial<Record<keyof DeckFormData, string>>;
    processing: boolean;
};

type Props = {
    form: DeckFormApi;
    submitLabel: string;
    onSubmit: FormEventHandler;
    cancelHref: string;
};

export default function DeckForm({
    form,
    submitLabel,
    onSubmit,
    cancelHref,
}: Props) {
    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div>
                <InputLabel htmlFor="name" value="Deck name" />
                <TextInput
                    id="name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className="mt-1 block w-full"
                    placeholder="e.g., Physics — Chapter 3"
                    autoFocus
                />
                <InputError message={form.errors.name} className="mt-2" />
            </div>

            <div>
                <InputLabel htmlFor="description" value="Description (optional)" />
                <textarea
                    id="description"
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    rows={3}
                    placeholder="What's this deck for?"
                />
                <InputError message={form.errors.description} className="mt-2" />
            </div>

            <div>
                <InputLabel value="Icon" />
                <div className="mt-1">
                    <IconPicker
                        value={form.data.icon}
                        onChange={(v) => form.setData('icon', v)}
                    />
                </div>
                <InputError message={form.errors.icon} className="mt-2" />
            </div>

            <div>
                <InputLabel value="Color" />
                <div className="mt-2">
                    <ColorPicker
                        value={form.data.color}
                        onChange={(v) => form.setData('color', v)}
                    />
                </div>
                <InputError message={form.errors.color} className="mt-2" />
            </div>

            <div>
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={form.data.shuffle_default}
                        onChange={(e) =>
                            form.setData('shuffle_default', e.target.checked)
                        }
                        className="mt-0.5 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Shuffle cards by default
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Off keeps cards in the order you added them.
                        </p>
                    </div>
                </label>
                <InputError message={form.errors.shuffle_default} className="mt-2" />
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