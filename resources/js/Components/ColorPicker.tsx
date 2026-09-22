import { DECK_COLORS } from '@/Constants/deckColors';

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export default function ColorPicker({ value, onChange }: Props) {
    return (
        <div className="flex flex-wrap gap-2">
            {DECK_COLORS.map((color) => (
                <button
                    key={color.value}
                    type="button"
                    onClick={() => onChange(color.value)}
                    aria-label={color.value}
                    className={
                        'h-8 w-8 rounded-full transition ' +
                        color.bg +
                        (color.value === value
                            ? ' ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-2 dark:ring-offset-gray-800'
                            : ' hover:scale-110')
                    }
                />
            ))}
        </div>
    );
}