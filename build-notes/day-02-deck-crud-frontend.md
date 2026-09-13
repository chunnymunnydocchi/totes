# TOTES — Day 2 Operations Manual (Segment 2 of 3)

> Frontend plumbing and the four React pages. By the end of Segment 2, a
> logged-in user can create, view, edit, and delete decks through the
> browser. The theme toggle flips `<html class="dark">` and persists to
> `users.theme`. The dark-mode visual sweep across Breeze components is
> NOT done — that's Day 3, and it is committed.

**Estimated time for Segment 2:** 3–4 hours.

**Scope discipline:** This segment ships UI that _works_, not UI that is
_finished_. Buttons that lead to unimplemented features (Add card,
Generate with AI) render disabled. Settings → Appearance page doesn't
exist — only the endpoint it will use. Toasts don't exist. Dark mode
across Breeze components doesn't exist. All four are deliberate, listed
at the end, and have target days.

---

## Guiding principle for Segment 2

Segment 1 established backend patterns. Segment 2 establishes **frontend
patterns** — how a page composes with `AuthenticatedLayout`, how a form
uses `useForm`, how Inertia handles redirects and validation errors, how
shared partials (like `DeckForm`) split between Create and Edit.

Every UI feature after today (cards, study mode, generation modal) will
copy these patterns. Two things matter most:

1. **The `useForm` shape.** `useForm<T>(initial)` with typed data, `setData`
   on change, `form.post/put` on submit, `form.errors` displayed inline.
   That pattern is what every remaining form in TOTES will use.
2. **The partial pattern.** Create and Edit share a form body. The only
   thing they differ on is which verb they submit. That split — "the form
   knows what fields exist, the page knows where they go" — is worth
   establishing once and reusing.

There are three **PAUSE** markers. The last one is the important one —
it's a click-through of the whole app, and if anything's broken we find
out there, not in Segment 3.

---

## Step 11 — Extend types and add the pre-paint theme script

### 11a. `resources/js/types/index.d.ts`

Open the file and replace its contents with:

```ts
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    theme: "light" | "dark" | "system";
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
```

**Why `theme` is required, not optional:** every `User` row has one (the
migration defaults to `'system'`). Making it optional would force a `?`
at every read site. Required reflects reality.

**Why the literal union, not `string`:** the backend validates against
exactly these three values. TypeScript should mirror that, so a typo in a
React file (`user.theme === 'Dark'`) is a compile error, not a silent
never-match.

### 11b. `resources/views/app.blade.php`

Two edits. First, the opening `<html>` tag. Replace:

```blade
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
```

With:

```blade
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    class="{{ ($page['props']['auth']['user']['theme'] ?? 'system') === 'dark' ? 'dark' : '' }}"
>
```

Second, add this script block immediately before `</head>`:

```blade
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
```

**Why two mechanisms — the `class` attribute AND the script:** the
`class` attribute is the server's best guess (from `users.theme`). It
covers the no-JS case and the first-paint case for users whose stored
theme matches their server theme. The script runs immediately after,
reads localStorage, and corrects the class before the browser paints
the body. If localStorage says something different from the server,
localStorage wins on this paint — and then the Inertia page props from
the same request carry the server value, which React uses to reconcile
on mount and overwrite localStorage. Server wins the _reconciliation_.
This is the hybrid model.

**Why try/catch:** localStorage throws in some privacy modes. A theme
preference should never crash the page. Swallowing the exception is
correct here, not lazy.

**Why not put this in a Vite-bundled script:** it must run before the
Vite bundle loads, synchronously, in `<head>`. A bundled module is a
network request, which means a flash. Inline is the only option that
avoids the flash.

**Why `$page['props']['auth']['user']['theme']` and not a dedicated
`$theme` variable:** the theme lives on the shared user prop. Reaching
into `$page` is a little ugly, but the alternative is a view composer
that runs on every request just to extract one string. The ugliness is
contained in one template. Not worth the ceremony.

**PAUSE #1.** Paste:

```bash
head -10 resources/views/app.blade.php
grep -c "totes-theme" resources/views/app.blade.php
cat resources/js/types/index.d.ts
```

Expected: the `<html>` tag has the `class` attribute with the theme
expression. The `grep -c` should print `1`. The type file should have
`theme: 'light' | 'dark' | 'system'` inside the `User` interface. If
any of those is off, fix before continuing — this is what ThemeToggle
reads.

---

## Step 12 — Write the ThemeToggle component

### 12a. `resources/js/Components/ThemeToggle.tsx`

```tsx
import { Icon } from "@iconify/react";
import { router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "totes-theme";

function resolveIsDark(theme: Theme): boolean {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
    const isDark = resolveIsDark(theme);
    document.documentElement.classList.toggle("dark", isDark);
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
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        if (theme !== "system") return;
        const handler = () => applyTheme("system");
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    const cycle = () => {
        const next: Theme =
            theme === "light" ? "dark" : theme === "dark" ? "system" : "light";

        setTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);

        router.patch(
            route("settings.appearance.update"),
            { theme: next },
            { preserveScroll: true, preserveState: true },
        );
    };

    const icon =
        theme === "light"
            ? "mdi:weather-sunny"
            : theme === "dark"
              ? "mdi:weather-night"
              : "mdi:theme-light-dark";

    const label =
        theme === "light"
            ? "Theme: light. Switch to dark."
            : theme === "dark"
              ? "Theme: dark. Switch to system."
              : "Theme: system. Switch to light.";

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
```

**Why `preserveState: true` and `preserveScroll: true`:** the toggle is a
visual concern, not a navigation. A full page reload on every toggle click
would feel broken. `preserveState` keeps React state; `preserveScroll`
keeps scroll position. Both are needed for the toggle to feel like a
UI affordance rather than a form submission.

**Why the optimistic local update (`setTheme` + `applyTheme`) before the
network call:** the network call may fail. The user's intent was clear.
Applying immediately and reconciling on failure (which we don't handle
on Day 2 — the PATCH is fire-and-forget) is the right UX. If the PATCH
fails silently, the user's local state is correct and their server state
is stale — they'll see the right theme on this device, and the wrong one
on another device until the next successful PATCH. Acceptable for Day 2.
Handle failure on Day 7.

**Why `usePage().props.auth.user.theme` and not a dedicated prop:** the
theme lives on the shared user prop already (Day 1's middleware shares
the whole user model). A dedicated `theme` shared prop would be a second
source. Use what exists.

**Why `useEffect` on `serverTheme` reconciles localStorage:** if the user
toggles dark on their phone, then opens the app on their laptop, the
laptop's localStorage may say `light` while the server says `dark`. On
this effect, the server value wins, localStorage is overwritten, and the
class is applied. That's the hybrid contract.

**Why the `useEffect` on `theme === 'system'`:** when the user's stored
theme is `system`, the app should follow OS changes live — not on next
reload. `matchMedia`'s `change` event fires when the OS theme changes;
we listen while in system mode and reapply. When the user picks
`light` or `dark`, we stop listening.

**PAUSE #2.** Paste:

```bash
ls resources/js/Components/ThemeToggle.tsx
npx tsc --noEmit
```

Expected: file exists, `tsc` clean. `npx tsc --noEmit` runs the
TypeScript compiler in check-only mode. If it prints errors, they're
almost certainly in the type imports — paste them. Don't ignore a
TypeScript error here; it will cascade into Segment 3's test run because
`npm run build` runs `tsc` first.

---

## Step 13 — Write the two picker components

### 13a. `resources/js/Components/IconPicker.tsx`

```tsx
import { DECK_ICONS } from "@/Constants/deckIcons";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export default function IconPicker({ value, onChange }: Props) {
    const [query, setQuery] = useState("");
    const debounceRef = useRef<number | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState("");

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
            <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2">
                <Icon
                    icon={value || "mdi:book-open-page-variant"}
                    className="h-5 w-5 shrink-0 text-gray-700"
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search icons..."
                    className="flex-1 border-0 bg-transparent p-0 text-sm placeholder-gray-400 focus:ring-0"
                />
                {isSearching && (
                    <Icon
                        icon="mdi:loading"
                        className="h-4 w-4 animate-spin text-gray-400"
                    />
                )}
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
                {filtered.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
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
                                    "flex h-9 w-9 items-center justify-center rounded-md transition " +
                                    (name === value
                                        ? "bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-1"
                                        : "text-gray-600 hover:bg-gray-100")
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
```

**Why the search is debounced at 200ms:** the data is local — no network
call — so debouncing isn't strictly necessary for correctness. But it
_does_ matter for one specific case: a user typing quickly should not
trigger 12 re-renders of 200 icon `<svg>`s. The debounce means the grid
only re-filters after the user pauses. That's a real perceived-perf win
on slower machines, at the cost of ~15 lines.

**Why the debounce lives in `useEffect` with a `useRef` timer, and not
`useMemo`:** `useMemo` runs synchronously during render. A debounce is a
_side effect_ (it schedules work for later). Mixing side effects into
`useMemo` is a known React antipattern — it will double-fire in Strict
Mode and behave unpredictably. The ref-plus-effect pattern is the correct
one.

**Why `isSearching` shows a spinner for 200ms of latency:** honest UI.
If the user typed a character and the grid hasn't updated yet, the
spinner says "we know, we're computing." It's a small tell that the
input is responsive. Without it, a fast typist might notice a one-frame
lag and wonder if the app froze.

**Why the search matches `name.toLowerCase().includes(q)`, not icon
tags or descriptions:** we have no tags. Our 200 icons were chosen to
be self-describing, so "book" matches `mdi:book-open-page-variant`,
"atom" matches `mdi:atom`, and so on. It's a curated list; the words in
the name are the words we curated for searchability.

**Why this is inline, not a modal:** `04-features.md` §2.2 shows Icon
as a form field with a search input inside it, not a "click here to
open picker" flow. Inline matches the doc. Inline is also simpler — no
modal state to lift, no focus trap to manage, no Escape handler to
write.

### 13b. `resources/js/Components/ColorPicker.tsx`

```tsx
import { DECK_COLORS } from "@/Constants/deckColors";

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
                    title={color.value}
                    aria-label={color.value}
                    className={
                        "h-8 w-8 rounded-full transition " +
                        color.bg +
                        (color.value === value
                            ? " ring-2 ring-gray-900 ring-offset-2"
                            : " hover:scale-110")
                    }
                />
            ))}
        </div>
    );
}
```

**Why `ring-gray-900` and not a color-matched ring:** the selected state
should read the same for every color. A blue ring on a blue swatch is
invisible; a blue ring on a rose swatch reads as a different color
entirely. Neutral ring, always. The swatch's own color comes from its
`bg-*` class.

**Why a fixed palette and not a color input:** `04-features.md` §2.2
lists exactly eight palette values. A native `<input type="color">`
would produce arbitrary values that the server rejects (`Rule::in`).
Fixed swatches and enumerated server validation are the same contract
expressed on both sides.

**PAUSE #3.** Paste:

```bash
ls resources/js/Components/IconPicker.tsx resources/js/Components/ColorPicker.tsx
npx tsc --noEmit
```

Expected: both files exist, `tsc` clean. If `tsc` complains about
`@/Constants/deckIcons` or `@/Constants/deckColors`, the tsconfig path
alias isn't resolving — the fix is to check `tsconfig.json` has
`"paths": { "@/*": ["./resources/js/*"] }` and that the files were
written to the right directory in Segment 1.

---

## Step 14 — Write the shared form partial

### 14a. `resources/js/Pages/Decks/Partials/DeckForm.tsx`

```bash
mkdir -p resources/js/Pages/Decks/Partials
```

```tsx
import ColorPicker from "@/Components/ColorPicker";
import IconPicker from "@/Components/IconPicker";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Link } from "@inertiajs/react";
import { FormEventHandler } from "react";

export type DeckFormData = {
    name: string;
    description: string;
    icon: string;
    color: string;
    shuffle_default: boolean;
};

export type DeckFormApi = {
    data: DeckFormData;
    setData: <K extends keyof DeckFormData>(
        key: K,
        value: DeckFormData[K],
    ) => void;
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
                    onChange={(e) => form.setData("name", e.target.value)}
                    className="mt-1 block w-full"
                    placeholder="e.g., Physics — Chapter 3"
                    autoFocus
                />
                <InputError message={form.errors.name} className="mt-2" />
            </div>

            <div>
                <InputLabel
                    htmlFor="description"
                    value="Description (optional)"
                />
                <textarea
                    id="description"
                    value={form.data.description}
                    onChange={(e) =>
                        form.setData("description", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    placeholder="What's this deck for?"
                />
                <InputError
                    message={form.errors.description}
                    className="mt-2"
                />
            </div>

            <div>
                <InputLabel value="Icon" />
                <div className="mt-1">
                    <IconPicker
                        value={form.data.icon}
                        onChange={(v) => form.setData("icon", v)}
                    />
                </div>
                <InputError message={form.errors.icon} className="mt-2" />
            </div>

            <div>
                <InputLabel value="Color" />
                <div className="mt-2">
                    <ColorPicker
                        value={form.data.color}
                        onChange={(v) => form.setData("color", v)}
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
                            form.setData("shuffle_default", e.target.checked)
                        }
                        className="mt-0.5 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-gray-900">
                            Shuffle cards by default
                        </span>
                        <p className="text-sm text-gray-500">
                            Off keeps cards in the order you added them.
                        </p>
                    </div>
                </label>
                <InputError
                    message={form.errors.shuffle_default}
                    className="mt-2"
                />
            </div>

            <div className="flex items-center gap-3">
                <PrimaryButton disabled={form.processing}>
                    {submitLabel}
                </PrimaryButton>
                <Link
                    href={cancelHref}
                    className="text-sm text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
```

**Why `form` is passed in as a prop instead of the partial calling
`useForm` itself:** Create and Edit need the _same_ form object to
submit with different verbs. If the partial owned the form, the page
couldn't reach it to call `form.post(...)` vs `form.put(...)`. Passing
the form down means the page owns submission, and the partial owns
layout. That's the right seam.

**Why `DeckFormApi` is a structural type instead of `InertiaForm<DeckFormData>`:**
Inertia's `useForm` return type is large and version-specific. Typing
against the _shape we use_ (`data`, `setData`, `errors`, `processing`)
means the partial doesn't break if Inertia adds a field. It also means
we could swap `useForm` for a different form hook later without touching
this file. Structural typing where possible, library types at the
boundary.

**Why the generic on `setData`:**
`setData<K extends keyof DeckFormData>(key: K, value: DeckFormData[K])`
means `setData('name', 42)` is a compile error and `setData('name', 'x')`
is fine. TypeScript catches what would otherwise be a runtime bug
(string saved to a text field, number saved to a name).

**Why `autoFocus` on the name field:** the user clicked "New deck" to
get here. They want to type a name. Auto-focusing the first field saves
one click and matches every other create-form in the world.

**Why the checkbox is a raw `<input>` and not Breeze's `Checkbox`:** the
Breeze `Checkbox` takes the same props and adds the same classes. Using
it would be marginally more consistent. Using a raw input lets us see
exactly what's rendering. Either is fine — swap if you prefer. The
important thing is that `form.setData('shuffle_default', e.target.checked)`
sets a real boolean, which the server's `prepareForValidation` normalizes
anyway.

---

## Step 15 — Write the four pages

### 15a. `resources/js/Pages/Decks/Index.tsx`

```tsx
import { DECK_COLORS } from "@/Constants/deckColors";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import { Icon } from "@iconify/react";

type Deck = {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    cards_count: number;
    due_cards_count: number;
};

export default function Index({ decks }: { decks: Deck[] }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        My Decks
                    </h2>
                    <Link
                        href={route("decks.create")}
                        className="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-gray-700"
                    >
                        New deck
                    </Link>
                </div>
            }
        >
            <Head title="My Decks" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {decks.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {decks.map((deck) => (
                                <DeckCard key={deck.id} deck={deck} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function DeckCard({ deck }: { deck: Deck }) {
    const color =
        DECK_COLORS.find((c) => c.value === deck.color) ?? DECK_COLORS[0];
    const hasCards = deck.cards_count > 0;

    return (
        <Link
            href={route("decks.show", deck.id)}
            className="block overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-md"
        >
            <div className={`h-1 ${color.bg}`} />
            <div className="flex items-start gap-3 p-5">
                <Icon
                    icon={deck.icon ?? "mdi:book-open-page-variant"}
                    className={`mt-0.5 h-6 w-6 shrink-0 ${color.text}`}
                />
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-gray-900">
                        {deck.name}
                    </h3>
                    {deck.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                            {deck.description}
                        </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                        <span>
                            {hasCards
                                ? `${deck.cards_count} ${deck.cards_count === 1 ? "card" : "cards"}`
                                : "Empty"}
                        </span>
                        {deck.due_cards_count > 0 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5">
                                {deck.due_cards_count} due
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function EmptyState() {
    return (
        <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
            <div className="p-12 text-center">
                <h3 className="text-lg font-medium text-gray-900">
                    No decks yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                    The only time education sucks is when you sit down to review
                    and don't know where to start.
                </p>
                <Link
                    href={route("decks.create")}
                    className="mt-6 inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-gray-700"
                >
                    Create your first deck
                </Link>
            </div>
        </div>
    );
}
```

**Why the `Deck` type is local to this file:** it's used here and in
`Show.tsx`, and again in `Edit.tsx` (slightly differently — no
`_count` fields). Lifting it to `types/index.d.ts` now would be
premature and would force the Edit page to care about fields it doesn't
receive. If a _third_ page needs the exact same shape, we lift it then.
That's the rule of two: the second usage is when you abstract, not the
first.

**Why the empty-state copy is verbatim from `04-features.md` §2.1:**
the doc has UI copy for every screen. We use it. If we paraphrase, we
drift from the doc, and the doc is the spec.

**Why no `line-clamp` plugin note here:** if your Tailwind version is
3.2.x (which `package.json` says with `^3.2.1`), `line-clamp-2` is not
in core — it was added in 3.3. If your actual installed version is 3.3+
via the caret range, it works. Check with `npm ls tailwindcss`. If it's
3.2, either `npm i -D @tailwindcss/line-clamp` and add it to
`tailwind.config.js`'s `plugins` array, or replace `line-clamp-2` with
`truncate`. This is the one open dependency question from Segment 1.
Resolve it before PAUSE #3 of this segment (the click-through), or the
description text will overflow badly.

### 15b. `resources/js/Pages/Decks/Create.tsx`

```tsx
import { DEFAULT_DECK_COLOR } from "@/Constants/deckColors";
import { DEFAULT_DECK_ICON } from "@/Constants/deckIcons";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeckForm from "@/Pages/Decks/Partials/DeckForm";
import { Head, useForm } from "@inertiajs/react";
import { FormEventHandler } from "react";

export default function Create() {
    const form = useForm({
        name: "",
        description: "",
        icon: DEFAULT_DECK_ICON,
        color: DEFAULT_DECK_COLOR as string,
        shuffle_default: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route("decks.store"));
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
                            cancelHref={route("decks.index")}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

**Why `DEFAULT_DECK_COLOR as string`:** `DEFAULT_DECK_COLOR` is typed
as the literal `'blue'` via `DeckColor` in `deckColors.ts`. `useForm`
in Inertia 2 infers the type from the initial object, and a literal
`'blue'` narrows the field to that one value — which then makes
`setData('color', 'purple')` a type error, because `'purple'` isn't
`'blue'`. The `as string` widens it back. This is a real friction point
with Inertia 2 + TS narrow literals. Casting the default value at the
call site is the cheapest fix. The alternative — typing the whole
`useForm` call explicitly — is more ceremony for the same outcome.

**Why `form` is passed whole to `DeckForm`:** we defined `DeckFormApi`
as a structural type in Step 14. `useForm`'s return value satisfies
it. TypeScript checks structurally. No adapter needed.

### 15c. `resources/js/Pages/Decks/Edit.tsx`

```tsx
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeckForm from "@/Pages/Decks/Partials/DeckForm";
import { Head, useForm } from "@inertiajs/react";
import { FormEventHandler } from "react";

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
        description: deck.description ?? "",
        icon: deck.icon ?? "mdi:book-open-page-variant",
        color: deck.color as string,
        shuffle_default: deck.shuffle_default,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(route("decks.update", deck.id));
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
                            cancelHref={route("decks.show", deck.id)}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

**Why `deck.color as string` on Edit but not needing it on Create:** on
Create, we cast `DEFAULT_DECK_COLOR` (a literal type) to `string`. On
Edit, `deck.color` comes from the server as a plain `string` already
(per the `Deck` type on line 6). So the `as string` is redundant here —
remove it if your TS config complains. Left in the snippet as a
reminder that both sites are doing the same widening.

**Why the description is `deck.description ?? ''`:** `useForm`'s initial
state is what the inputs are bound to. If `description` were `null`, the
textarea's `value` prop would be `null`, which React warns about. `?? ''`
normalizes to an empty string. The server accepts empty string as
`nullable` and stores it as an empty text field. That's fine — an empty
description and a null description are functionally equivalent for our
UI.

### 15d. `resources/js/Pages/Decks/Show.tsx`

```tsx
import { DECK_COLORS } from "@/Constants/deckColors";
import DangerButton from "@/Components/DangerButton";
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import { Icon } from "@iconify/react";
import { useState } from "react";

type Deck = {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string;
    cards_count: number;
    due_cards_count: number;
};

export default function Show({ deck }: { deck: Deck }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const color =
        DECK_COLORS.find((c) => c.value === deck.color) ?? DECK_COLORS[0];

    const deleteDeck = () => {
        router.delete(route("decks.destroy", deck.id), {
            onFinish: () => setConfirmingDelete(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon
                            icon={deck.icon ?? "mdi:book-open-page-variant"}
                            className={`h-6 w-6 ${color.text}`}
                        />
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            {deck.name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route("decks.edit", deck.id)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Edit
                        </Link>
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={deck.name} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {deck.description && (
                        <p className="text-sm text-gray-600">
                            {deck.description}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Stat label="Total cards" value={deck.cards_count} />
                        <Stat label="Due now" value={deck.due_cards_count} />
                        <Stat label="Mastered" value={0} />
                        <Stat label="Last studied" value="Never" />
                    </div>

                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between border-b border-gray-100 p-6">
                            <h3 className="font-medium text-gray-900">Cards</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled
                                    title="Available on Day 3"
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-400"
                                >
                                    Add card
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    title="Available on Day 4"
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-400"
                                >
                                    Generate with AI
                                </button>
                            </div>
                        </div>
                        <div className="p-12 text-center text-sm text-gray-500">
                            No cards yet. Generate a batch from your notes, or
                            add one manually.
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                show={confirmingDelete}
                onClose={() => setConfirmingDelete(false)}
                maxWidth="md"
            >
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900">
                        Delete &ldquo;{deck.name}&rdquo;?
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        This will also delete {deck.cards_count} cards and all
                        their review history. This cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton
                            onClick={() => setConfirmingDelete(false)}
                            autoFocus
                        >
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={deleteDeck}>
                            Delete deck
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500">
                {label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
                {value}
            </div>
        </div>
    );
}
```

**Why "Mastered" is hardcoded to 0 and "Last studied" to "Never":**
mastery is "repetitions >= 5" per `04-features.md` §2.5, but we have no
review logs yet. Last-studied needs a `MAX(reviewed_at)` on the user's
review logs for this deck. Both are computable on Day 5. Hardcoding the
placeholders today makes the layout stable. This is a known gap. It is
not a bug.

**Why the disabled buttons still render:** a stable layout is a
prerequisite for a small Day 3 diff. If the buttons appeared only on
Day 3, the header layout would shift. If they render today, Day 3
changes `disabled` to `false` and wires `onClick`. Small, deliberate.

**Why the "Study now" CTA from the doc is not on this page:** the doc
says "Study now ({n} due)" or "Generate your first cards." Our cards are
zero, so the doc's rule would have us show "Generate your first cards" —
which is Day 4. Omitting it is more honest than showing a button that
does nothing. We'll add it when it works.

**Why `onFinish` and not `onSuccess` on the delete:** `onFinish` runs
regardless of whether the DELETE succeeded or failed. If the request
succeeds, the server redirects to `/decks` and Inertia navigates away —
but `onFinish` still fires first to close the modal. If the request
fails, we still want to close the modal so the user can see the error
state. `onFinish` is the right hook for "reset local UI state."

**PAUSE #4.** Paste:

```bash
ls resources/js/Pages/Decks/
ls resources/js/Pages/Decks/Partials/
npx tsc --noEmit
```

Expected: `Index.tsx`, `Create.tsx`, `Edit.tsx`, `Show.tsx`, and
`Partials/DeckForm.tsx`. `tsc` clean. If `tsc` complains about
`line-clamp-2` — that's a Tailwind class, not a TS thing, so it wouldn't
complain. If it complains about unused imports or missing types, paste
them. Fix any error before moving on, because Segment 3 runs
`npm run build`, which runs `tsc`, and a TS error there blocks the
whole test suite.

---

## Step 16 — Wire up the layout

Three edits to `resources/js/Layouts/AuthenticatedLayout.tsx`.

### 16a. Add imports

Add at the top, alongside the existing imports:

```tsx
import ThemeToggle from "@/Components/ThemeToggle";
```

### 16b. Add the Decks nav link (desktop) and the ThemeToggle

Find this block:

```tsx
<div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
    <NavLink href={route("dashboard")} active={route().current("dashboard")}>
        Dashboard
    </NavLink>
</div>
```

Add after the existing `NavLink`:

```tsx
<NavLink href={route("decks.index")} active={route().current("decks.*")}>
    Decks
</NavLink>
```

Then find the desktop user dropdown block:

```tsx
<div className="hidden sm:ms-6 sm:flex sm:items-center">
    <div className="relative ms-3">
        <Dropdown>
```

Insert `<ThemeToggle />` before the dropdown wrapper:

```tsx
<div className="hidden sm:ms-6 sm:flex sm:items-center">
    <ThemeToggle />
    <div className="relative ms-3">
        <Dropdown>
```

### 16c. Add the Decks link to the mobile menu

Find the mobile nav block:

```tsx
<div className="space-y-1 pb-3 pt-2">
    <ResponsiveNavLink
        href={route("dashboard")}
        active={route().current("dashboard")}
    >
        Dashboard
    </ResponsiveNavLink>
</div>
```

Add after the existing link:

```tsx
<ResponsiveNavLink
    href={route("decks.index")}
    active={route().current("decks.*")}
>
    Decks
</ResponsiveNavLink>
```

**Why `route().current('decks.*')`:** Ziggy's `current` accepts
wildcards. The active state should highlight for index, show, edit,
create — every deck route. `decks.index` alone would un-highlight when
viewing a deck, which feels wrong.

**Why the mobile theme toggle is deliberately omitted:** the
`ResponsiveNavLink` component is link-shaped. Fitting a button into it
requires either a new component or a hack. On mobile, dark mode is
best-effort until Day 7. The desktop toggle is enough for the demo,
and adding a mobile variant is a Day 7 polish item, not a Day 2
requirement. This is in the "not doing today" list at the end of
Segment 3.

---

## Step 17 — Click through the whole app

This is the important pause. Tests come in Segment 3, but a manual pass
catches things a test won't — visual layout, class names, the actual
behavior of the toggle.

**Start both servers if they aren't already running:**

```bash
npm run dev          # terminal 1
php artisan serve    # terminal 2
```

**Then, in the browser:**

1. **Register a new account.** Land on `/decks`, not `/dashboard`.
   _This is the redirect fix from Segment 1, Step 10b. If you land on
   the dashboard, that edit didn't take._

2. **The empty state renders.** Copy matches `04-features.md` §2.1:
   "No decks yet" / "The only time education sucks is when you sit down
   to review and don't know where to start." / "Create your first deck."

3. **Create a deck.** Name it, type a search like "book" in the icon
   picker, confirm results filter, pick one. Pick a color. Toggle
   Shuffle on. Submit.

4. **Land on the show page.** Icon and name render in the header.
   Stats strip shows `0 / 0 / 0 / Never`. Add card and Generate buttons
   are visible but disabled. Delete opens the modal.

5. **Cancel the delete modal with the Escape key.** The modal should
   close. This is Breeze's `Modal` behavior, but worth confirming.

6. **Edit the deck.** Form is pre-filled, including icon selection and
   color. Change the name, save. Land back on the show page with the
   new name.

7. **Delete the deck.** Open modal, Cancel first to confirm the cancel
   path. Then open again and confirm. Land back on `/decks` with the
   empty state.

8. **Toggle the theme in the nav.** `<html>` gets `class="dark"`.
   **Expected: most of the page stays light.** The nav background
   stays white, the page background stays `bg-gray-100`, the deck
   cards stay white. Only the toggle's own icon changes. **This is
   correct for Day 2.** Confirm the class on `<html>` actually flips
   in DevTools. Confirm the database updated:
   `php artisan tinker --execute "dump(App\Models\User::first()->theme);"`

9. **Reload the page after toggling to dark.** **Expected: no flash
   of light theme.** The pre-paint script should apply `dark` before
   the browser paints. If you see a flash, the script in `app.blade.php`
   isn't running before paint — check that it's inside `<head>`, before
   `@vite` and before `@inertia`. Debug this before continuing; the
   flash is the entire reason the script exists.

10. **Open DevTools console.** No errors, no warnings about keys, no
    React hydration mismatches.

**PAUSE #5.** Paste:

- A one-line summary of each of the 10 steps (works / doesn't work).
- The output of `php artisan tinker --execute "dump(App\Models\Deck::count(), App\Models\User::count());"` after you've deleted your test deck.
- Any console errors from step 10, verbatim.

If all ten steps are green, Segment 2 is done. If any step fails, stop
and paste the failure — we fix it here, not in Segment 3.

---

## End of Segment 2

The app is now clickable. A user can create, view, edit, and delete
decks. The theme toggle works. The dark-mode _visual_ state is
unfinished and known to be unfinished — Segment 3's manual verification
and the "not doing today" list both say so explicitly, so there's no
ambiguity about whether Day 2 failed to complete something.

Segment 3 covers:

- `tests/Feature/Decks/DeckCrudTest.php` — feature tests
- `tests/Unit/Support/DeckConstantsTest.php` — wait, this was cut in
  Segment 1 when we deleted the PHP constants. Segment 3 will have only
  the feature test file, plus a check that `DeckFactory` produces valid
  data.
- Manual verification pass (this is largely done at PAUSE #5; Segment 3
  documents it as a permanent record)
- `git add`, `git status` review, commit
- `SESSION-STATE.md` update
- The "what I'm deliberately NOT doing today" list

Before you ask for Segment 3: is there anything in the click-through
that didn't work? If so, tell me and we debug here. If not, say so and
I'll send Segment 3.
