import { Icon } from '@iconify/react';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'totes-theme';

function resolveIsDark(theme: Theme): boolean {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
    const isDark = resolveIsDark(theme);
    document.documentElement.classList.toggle('dark', isDark);
}

export default function ThemeToggle() {
    const serverTheme = usePage().props.auth.user.theme as Theme;
    const [theme, setTheme] = useState<Theme>(serverTheme);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored && stored !== serverTheme) {
            localStorage.setItem(STORAGE_KEY, serverTheme);
            setTheme(serverTheme);
            applyTheme(serverTheme);
        } else if (!stored) {
            localStorage.setItem(STORAGE_KEY, serverTheme);
        }
    }, [serverTheme]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (theme !== 'system') return;
        const handler = () => applyTheme('system');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const cycle = () => {
        const next: Theme =
            theme === 'light' ? 'dark' :
                theme === 'dark' ? 'system' :
                    'light';

        setTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);

        router.patch(
            route('settings.appearance.update'),
            { theme: next },
            { preserveScroll: true, preserveState: true },
        );
    };

    const icon =
        theme === 'light' ? 'mdi:weather-sunny' :
            theme === 'dark' ? 'mdi:weather-night' :
                'mdi:theme-light-dark';

    const label =
        theme === 'light' ? 'Theme: light. Switch to dark.' :
            theme === 'dark' ? 'Theme: dark. Switch to system.' :
                'Theme: system. Switch to light.';

    return (
        <button
            type="button"
            onClick={cycle}
            title={label}
            aria-label={label}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-500 transition hover:text-gray-700 focus:outline-none"
        >
            <Icon icon={icon} className="h-5 w-5" />
        </button>
    );
}