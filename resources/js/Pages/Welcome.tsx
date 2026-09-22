import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="TOTES" />
            <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
                    <Link
                        href="/"
                        className="text-lg font-semibold tracking-tight"
                    >
                        TOTES
                    </Link>
                    <nav className="flex items-center gap-1">
                        {auth.user ? (
                            <Link
                                href={route('decks.index')}
                                title={auth.user.name}
                                className="max-w-[12ch] truncate rounded-md px-3 py-2 text-sm transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-gray-300"
                            >
                                {auth.user.name}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="rounded-md px-3 py-2 text-sm transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-gray-300"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white dark:focus-visible:ring-offset-gray-900"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                        TOTES
                    </h1>
                    <p className="mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
                        The only time education sucks is when...
                    </p>
                </main>
            </div>
        </>
    );
}