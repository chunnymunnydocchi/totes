import { DECK_ICONS } from '@/Constants/deckIcons';
import { Icon } from '@iconify/react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export default function IconPicker({ value, onChange }: Props) {
    const [query, setQuery] = useState('');
    const debounceRef = useRef<number | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
        }
        debounceRef.current = window.setTimeout(() => {
            setDebouncedQuery(query);
        }, 200);

        return () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    const filtered = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        if (!q) return DECK_ICONS;
        return DECK_ICONS.filter((name) => name.toLowerCase().includes(q));
    }, [debouncedQuery]);

    const isSearching = query !== debouncedQuery;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-500 dark:focus-within:ring-indigo-400">
                <Icon
                    icon={value || 'mdi:book-open-page-variant'}
                    className="h-5 w-5 shrink-0 text-gray-700 dark:text-gray-300"
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search icons..."
                    className="flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0"
                />
                {isSearching && (
                    <Icon
                        icon="mdi:loading"
                        className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500"
                    />
                )}
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
                {filtered.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No icons match that search.
                    </div>
                ) : (
                    <div className="grid grid-cols-8 gap-1">
                        {filtered.map((name) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => onChange(name)}
                                title={name}
                                className={
                                    'flex h-9 w-9 items-center justify-center rounded-md transition ' +
                                    (name === value
                                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-1 dark:ring-offset-gray-800'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700')
                                }
                            >
                                <Icon icon={name} className="h-5 w-5" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}