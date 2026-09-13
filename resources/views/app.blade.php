<!DOCTYPE html>
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    class="{{ ($page['props']['auth']['user']['theme'] ?? 'system') === 'dark' ? 'dark' : '' }}"
>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
    <script>
    (function () {
        try {
            var stored = localStorage.getItem('totes-theme');
            var server = @json($page['props']['auth']['user']['theme'] ?? 'system');
            var resolved = stored || server;
            var isDark = resolved === 'dark' ||
                (resolved === 'system' &&
                 window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } catch (e) {}
    })();
    </script>
</html>
