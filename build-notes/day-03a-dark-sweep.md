# Day 3a — Dark Mode Sweep + Mobile Theme Toggle + Welcome Reduction + Dashboard Removal

**Objective:** Every component and page that renders inside `AuthenticatedLayout` must look correct when `<html class="dark">` is set. The theme toggle must be reachable on mobile without opening the hamburger menu. `Welcome.tsx` is reduced to title, slogan, and nav. Dashboard is removed. Nothing else changes.

**Estimated time:** 2–3 hours including verification.

**Commit boundary:** One commit at the end. Do not commit mid-sweep — half-swept dark mode is worse than none, because you can't tell what's broken vs. unfinished.

---

## 0. Prerequisites — start the stack

You know this, but it's here so the manual is self-contained:

1. XAMPP Control Panel → start MySQL.
2. Terminal 1: `npm run dev`
3. Terminal 2: `php artisan serve`
4. Browser: `http://localhost:8000`, log in.

**Why:** You need the dev server running to see changes live. `npm run dev` runs Vite in watch mode; edits to `.tsx` files hot-reload. `php artisan serve` is needed because §6 edits `routes/web.php`. Keeping both running avoids surprises.

---

## 1. The palette — memorize these values

This is the single most important part of the manual. Every edit below uses **only** these values. If you find yourself reaching for a seventh, stop and ask why.

| Role                                          | Light (existing)        | Dark (add this)             |
| --------------------------------------------- | ----------------------- | --------------------------- |
| Page background                               | `bg-gray-100`           | `dark:bg-gray-900`          |
| Surface (cards, nav, modal, dropdown, inputs) | `bg-white`              | `dark:bg-gray-800`          |
| Border — structural                           | `border-gray-100/200`   | `dark:border-gray-700`      |
| Border — interactive (inputs, buttons)        | `border-gray-300`       | `dark:border-gray-600`      |
| Primary text                                  | `text-gray-700/800/900` | `dark:text-gray-100`        |
| Secondary/muted text                          | `text-gray-400/500/600` | `dark:text-gray-400`        |
| Hover surface                                 | `hover:bg-gray-50/100`  | `dark:hover:bg-gray-700`    |
| Placeholder text                              | `placeholder-gray-400`  | `dark:placeholder-gray-500` |

**Why these values and not others:**

- `gray-900` for page background and `gray-800` for surfaces creates a _two-level_ depth hierarchy. If both were `gray-900`, cards would disappear into the page. If surfaces were `gray-700`, the page would feel muddy. This pairing is the Tailwind-community standard because it works.
- `gray-100` for primary text (not pure white) reduces eye strain. Pure white on dark is a known readability problem — it causes halation, especially for people with astigmatism. `gray-100` is soft enough to read for long sessions.
- `gray-400` for muted text is the _lowest_ you should go. `gray-500` on `gray-900` fails WCAG AA contrast for body text. If you need something dimmer than `gray-400`, you're hiding information the user needs.
- **Structural vs interactive borders:** structural borders (nav underline, card edges, menu dividers) are meant to be barely visible — `gray-700` is correct. Interactive borders (inputs, buttons, checkboxes) tell the user "this is a control" — they need `gray-600`, because `gray-700` on `gray-800` is effectively invisible.

**The ring-offset problem.** Several components use `focus:ring-2 focus:ring-offset-2`. The offset ring defaults to **white**. On a dark page, that produces a white halo around focused elements. Every focus ring needs a matching `dark:focus:ring-offset-*`. I'll call this out per-file where it applies. This is the single most commonly-missed part of a dark sweep — it doesn't show up until you Tab through the page.

---

## 2. Layer 1 — the component sweep

Work top to bottom. Each entry says **what's broken**, **what to add**, and **why**. Open the file, make the edit, move on. Do not save all edits and test at the end — you'll lose track of which file caused what.

### 2.1 `resources/js/Components/InputLabel.tsx`

**Broken:** `text-gray-700` label is nearly invisible on `bg-gray-800` surfaces.

**Edit:** add `dark:text-gray-300` to the label className.

```
`block text-sm font-medium text-gray-700 dark:text-gray-300 `
```

**Why `gray-300` and not `gray-100`:** labels are secondary to the input value. `gray-300` keeps them readable but visually subordinate to the content inside the field. `gray-100` would make them compete with the input text.

---

### 2.2 `resources/js/Components/InputError.tsx`

**Broken:** `text-red-600` on dark is legible but muddy.

**Edit:** add `dark:text-red-400` to the `<p>` className.

```
'text-sm text-red-600 dark:text-red-400 ' + className
```

**Why:** `red-400` is the standard "error red" for dark UIs. `red-600` loses saturation against `gray-800`; `red-400` pops without being neon.

---

### 2.3 `resources/js/Components/Checkbox.tsx`

**Broken:** `border-gray-300` unchecked box border vanishes on dark.

**Edit:** add `dark:border-gray-600 dark:bg-gray-800` to the input className, and a dark focus-offset.

```
'rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800 ' + className
```

**Why `border-gray-600` and not `border-gray-700`:** an unchecked checkbox is an _interactive affordance_ — the user must see it exists. `gray-700` on `gray-800` is a 1-step contrast difference, effectively invisible. `gray-600` is the minimum to read as a border without shouting.

**Why `dark:bg-gray-800`:** without it, the browser renders the native checkbox background, which is white on some browsers and transparent on others. Setting it explicitly makes the checkbox consistent across browsers in dark mode.

---

### 2.4 `resources/js/Components/PrimaryButton.tsx`

**Broken:** `bg-gray-800` button disappears into `bg-gray-800` surfaces and `bg-gray-900` page backgrounds.

**Edit:** add a dark variant that _inverts_ the button — light background, dark text. This is the standard treatment for primary buttons on dark UIs.

```
`inline-flex items-center rounded-md border border-transparent bg-gray-800 dark:bg-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white dark:text-gray-900 transition duration-150 ease-in-out hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:bg-gray-900 dark:active:bg-gray-200 ${disabled && 'opacity-25'} ` + className
```

**Why invert instead of keeping it dark:** a primary button's job is to be the most visually prominent thing on screen. On a dark page, the only way to achieve that with a gray button is to _invert_ — light button, dark text. A `gray-700` button on `gray-900` page is a _dimmer_ element, which is backwards for a primary action. This is also why the danger button (`bg-red-600`) works fine on dark: red is saturated enough to stand out against gray without inverting.

---

### 2.5 `resources/js/Components/DangerButton.tsx`

**Broken:** only the focus ring offset. The button itself (`bg-red-600` with `text-white`) reads fine on dark.

**Edit:** add `dark:focus:ring-offset-gray-900`.

```
`... focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:bg-red-700 ${disabled && 'opacity-25'} ` + className
```

**Why so little:** this is a case where the component was already dark-mode-compatible by accident, because red-600 is saturated. The only bug is the white focus halo. Don't change what isn't broken.

---

### 2.6 `resources/js/Components/NavLink.tsx`

**Broken:** all three states (`active`, `hover`, `default`) use gray values that vanish on dark.

**Edit:** add dark variants to all three states, plus focus-offset.

Active state:

```
'border-indigo-400 text-gray-900 dark:text-gray-100 focus:border-indigo-700 dark:focus:border-indigo-300'
```

Inactive state:

```
'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-200 focus:border-gray-300 dark:focus:border-gray-600 focus:text-gray-700 dark:focus:text-gray-200'
```

**Why `dark:focus:border-indigo-300` for active:** `indigo-700` on dark is nearly black, so the focus indicator would disappear. `indigo-300` keeps it visible. Same reasoning as `InputError`'s red — lighten saturated colors for dark backgrounds.

---

### 2.7 `resources/js/Components/ResponsiveNavLink.tsx`

**Broken:** all three states break, worst offender is `bg-indigo-50` active state (light-blue block on dark page).

**Edit:**

Active state:

```
'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 focus:border-indigo-700 dark:focus:border-indigo-400 focus:bg-indigo-100 dark:focus:bg-indigo-900 focus:text-indigo-800 dark:focus:text-indigo-100'
```

Inactive state:

```
'border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 focus:border-gray-300 dark:focus:border-gray-600 focus:bg-gray-50 dark:focus:bg-gray-700 focus:text-gray-800 dark:focus:text-gray-100'
```

**Why `indigo-950` and not `indigo-900`:** the active link is a _highlight_, not a primary surface. `indigo-900` on `gray-900` page reads too close to the page itself. `indigo-950` is darker, but the _text_ (`indigo-200`) does the work of making the state obvious. This is a case where the pairing matters more than either value alone.

**Note on `indigo-950`:** requires Tailwind 3.3+. Your resolved version is 3.4.19, so it works. If you ever downgrade below 3.3, use `indigo-900`.

---

### 2.8 `resources/js/Components/Dropdown.tsx`

**Broken:** three places. The `Content` panel (`bg-white`), the ring (`ring-black ring-opacity-5`), and `DropdownLink` (`text-gray-700 hover:bg-gray-100`).

**Edits:**

In `Content`'s default `contentClasses` prop, change:

```
contentClasses = 'py-1 bg-white dark:bg-gray-800'
```

In `Content`'s ring div:

```
`rounded-md ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 ` + contentClasses
```

In `DropdownLink`:

```
'block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 dark:text-gray-200 transition duration-150 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ' + className
```

**Why `dark:ring-white dark:ring-opacity-10`:** on a dark page, a black ring on a dark panel is invisible. Inverting to white at 10% opacity gives the panel a subtle edge — the same visual function the black ring serves on light. This is a case where the _function_ (separate panel from page) matters, not the literal color.

---

### 2.9 `resources/js/Components/Modal.tsx`

**Broken:** two places. The overlay `bg-gray-500/75` (a light gray scrim over a dark page looks washed out) and the panel `bg-white` (a white modal on a dark page).

**Edits:**

Overlay:

```
<div className="absolute inset-0 bg-gray-500/75 dark:bg-gray-900/80" />
```

Panel:

```
`mb-6 transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all sm:mx-auto sm:w-full ${maxWidthClass}`
```

**Why `gray-900/80` for the overlay:** on a dark page, the _purpose_ of the overlay is to push the rest of the UI back so the modal pops. A `gray-500` scrim on a `gray-900` page makes the page _lighter_, which inverts the intended depth. `gray-900/80` keeps the page dark and adds dimming. Same function, opposite direction.

---

### 2.10 `resources/js/Components/ApplicationLogo.tsx` — **no edit to this file**

**The fix is in the layout.** See §3.2.

---

### 2.11 `resources/js/Components/ColorPicker.tsx`

**Broken:** the selection ring. `ring-gray-900` invisible on dark, `ring-offset-2` defaults to white → white halo.

**Edit:** change the selected-state classes:

```
? ' ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-2 dark:ring-offset-gray-800'
```

**Why `dark:ring-offset-gray-800`:** the swatch sits on whatever surface contains it. In the deck form, that's the form's surface (`gray-800` after the sweep). Matching the offset to the surface makes the ring look like it's _on_ the swatch, not floating. If a swatch ever renders on the page background directly, this value would need to become `gray-900` — but that's not the current usage.

---

### 2.12 `resources/js/Components/IconPicker.tsx`

**Broken:** six surfaces. This is the biggest single file in the sweep.

**Edits:**

Search container:

```
className="flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
```

Preview icon:

```
className="h-5 w-5 shrink-0 text-gray-700 dark:text-gray-300"
```

Input:

```
className="flex-1 border-0 bg-transparent p-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0"
```

Loading spinner:

```
className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500"
```

Results container:

```
className="max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2"
```

Empty state:

```
className="p-4 text-center text-sm text-gray-500 dark:text-gray-400"
```

Selected icon button:

```
? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 ring-2 ring-gray-900 dark:ring-gray-100 ring-offset-1 dark:ring-offset-gray-800'
```

Unselected icon button:

```
: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
```

**Why the input needs explicit `text-gray-900 dark:text-gray-100`:** without an explicit text color, the input inherits from the parent, and the parent chain in dark mode may not set text color. Explicit is safer than inherited for form fields. This is the same reasoning as the checkbox background.

**Why the selected icon inverts (`bg-gray-900 dark:bg-gray-100`):** consistency with `PrimaryButton`. Selected/primary states invert on dark. This is a rule, not a per-component decision.

---

### 2.13 `resources/js/Components/ThemeToggle.tsx`

**Broken:** `text-gray-500 hover:text-gray-700` — the hover state gets _darker_ on dark, so the icon appears to fade out on hover.

**Edit:** change the button className:

```
className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
```

**Why `dark:hover:text-gray-100`:** the hover intent is "bring this to attention." On light, that means darker. On dark, it means lighter. The _direction_ flips, the intent doesn't.

---

### 2.14 `resources/js/Components/TextInput.tsx`

**Broken:** two distinct problems, one visible and one subtle.

1. `border-gray-300` is nearly invisible on dark surfaces.
2. **The base string sets no `bg-*` and no `text-*`.** The input inherits both from its parent. On light pages this happens to work (parent is white, browser default text is black). On dark pages, the input background becomes `gray-800` (inherited) and the text color becomes whatever the browser defaults to — often black, which is unreadable on `gray-800`. This is the same class of bug as `Checkbox` and `IconPicker`: an _absence_ that happens to work on light and breaks on dark.

**Edit:** add explicit background, text color, and dark variants to the base string. The `className` prop is _appended_, so this single edit fixes every form in the app.

```
'rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800 ' + className
```

**Why explicit `bg-white` and `text-gray-900` on the light side, not just dark variants:** if we only add `dark:bg-gray-800 dark:text-gray-100`, the light side still relies on inheritance. That works today, but it's fragile — the moment a `TextInput` is placed on a non-white surface, it breaks in light mode too. Explicit is correct on both sides. This is a _fix_, not just a dark-mode adaptation.

**Why `dark:placeholder-gray-500`:** the default placeholder color is a mid-gray that's legible on white but invisible on `gray-800`. `gray-500` is the darkest placeholder that still reads as "placeholder, not value" against `gray-800`.

**Why the defensive focus-ring offset:** the current base string has no `focus:ring-offset-*`, so no white halo problem exists today. `dark:focus:ring-offset-gray-800` is included in case a consumer adds `focus:ring-offset-2` via `className`. It costs nothing and prevents a future bug.

---

### 2.15 `resources/js/Components/SecondaryButton.tsx`

**Broken:** `bg-white` with `border-gray-300` and `text-gray-700`. On dark surfaces, this is a white button with dark-gray text — the single highest-contrast wrong element in the app. Every Cancel button, every modal dismiss, every secondary action.

**Edit:** do **not** invert this the way `PrimaryButton` inverts. Secondary buttons are visually subordinate on purpose; inverting them to light-on-dark would make them compete with the primary button for attention. Instead, keep them dark and adjust border and text.

```
`inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm transition duration-150 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-25 ${disabled && 'opacity-25'} ` + className
```

**Why not invert like `PrimaryButton`:** the visual hierarchy is primary > secondary > tertiary. On light, `PrimaryButton` is dark-on-light (prominent) and `SecondaryButton` is white-with-border (subordinate). On dark, the equivalent hierarchy is: `PrimaryButton` is light-on-dark (prominent, inverted) and `SecondaryButton` is `gray-800`-with-border (subordinate, same surface as the page). If `SecondaryButton` also inverted, both buttons would be light and the hierarchy would collapse — the user couldn't tell which is the primary action.

**Why `dark:text-gray-300` and not `gray-100`:** same reasoning as `InputLabel`. Secondary button text is subordinate to primary button text. `gray-300` keeps it readable but visually quieter than `PrimaryButton`'s `dark:text-gray-900` on its light background.

**Why `dark:border-gray-600`:** the border _is_ the button on a dark surface. `gray-700` would be a one-step contrast difference from `gray-800` and effectively invisible. `gray-600` is the minimum that reads as a distinct edge.

---

### 2.16 `resources/js/Pages/Decks/Partials/DeckForm.tsx` — inline classes

**Broken:** `DeckForm` uses a raw `<textarea>` and a raw `<input type="checkbox">` instead of the `TextInput` and `Checkbox` components. Because they're raw elements with inline light-only classes, §2.14's fix to `TextInput` and §2.3's fix to `Checkbox` **do not reach them.** They need their own dark variants.

Also light-only: the "Shuffle cards by default" `<span>`, its helper `<p>`, and the "Cancel" link.

**Why this is in the component sweep even though it's a Page, not a Component:** the sweep's rule is "everything rendering inside `AuthenticatedLayout` looks correct in dark." A raw element with inline classes is functionally a component — it just isn't factored out. Leaving it unswept would mean the deck create/edit forms render wrong in dark, which is the bug we're fixing. The _refactor_ to use `TextInput` and `Checkbox` is a separate task, deferred to Day 7.

**Edits:**

The `<textarea>`:

```
className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
```

The shuffle `<input type="checkbox">`:

```
className="mt-0.5 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-gray-800"
```

The "Shuffle cards by default" `<span>`:

```
className="text-sm font-medium text-gray-900 dark:text-gray-100"
```

The helper `<p>`:

```
className="text-sm text-gray-500 dark:text-gray-400"
```

The "Cancel" link:

```
className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
```

**Why the textarea gets the full treatment and the checkbox doesn't:** the textarea is the input a user _types into_ — it needs the same explicit background, text color, and placeholder treatment as `TextInput` (§2.14), for the same reason: absence of an explicit value works on light by accident and breaks on dark. The checkbox only needs border/background/focus, matching §2.3.

**Note for Day 7:** these inline classes are a drift hazard. `DeckForm` should use `TextInput` and `Checkbox` so a future style change happens in one place. Deferred, not forgotten — the same reasoning as the `CardForm` decision in `day-03b`.

---

## 3. Layer 2 — mobile theme toggle

Now the layout. This section both finishes the dark sweep for `AuthenticatedLayout` **and** moves the toggle into the mobile top bar. One file, one pass.

### 3.1 Page background and nav surfaces

`<div className="min-h-screen bg-gray-100">` → add `dark:bg-gray-900`.

`<nav className="border-b border-gray-100 bg-white">` → add `dark:border-gray-700 dark:bg-gray-800`.

`<header className="bg-white shadow">` → add `dark:bg-gray-800`.

**Why the header and nav match:** both are "chrome" surfaces sitting above the page. They use the same surface value (`gray-800`) so the app has a consistent visual frame. If they differed, the app would look assembled from parts rather than designed.

### 3.2 Desktop nav — the logo and dropdown trigger

Logo:

```
<ApplicationLogo className="block h-9 w-auto fill-current text-gray-800 dark:text-gray-100" />
```

Dropdown trigger button:

```
className="inline-flex items-center rounded-md border border-transparent bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium leading-4 text-gray-500 dark:text-gray-400 transition duration-150 ease-in-out hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
```

### 3.3 Desktop nav — nothing else changes

`ThemeToggle` already sits in the desktop region (`hidden sm:ms-6 sm:flex sm:items-center`). Leave it. It gets the dark variant from §2.13.

### 3.4 Mobile top bar — **the structural change**

This is the only structural edit in the whole manual. Find:

```tsx
<div className="-me-2 flex items-center sm:hidden">
    <button
        onClick={() => setShowingNavigationDropdown((previousState) => !previousState)}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
    >
```

Replace with:

```tsx
<div className="-me-2 flex items-center gap-1 sm:hidden">
    <ThemeToggle />
    <button
        onClick={() => setShowingNavigationDropdown((previousState) => !previousState)}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 dark:text-gray-500 transition duration-150 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-500 dark:focus:text-gray-300 focus:outline-none"
    >
```

**Two changes:** `gap-1` on the container (so the toggle and hamburger aren't touching), and `<ThemeToggle />` before the hamburger button. Then dark variants on the hamburger.

**Why the toggle comes first (left of hamburger):** reading order. On mobile, the rightmost element is the "primary" affordance for the thumb. The hamburger is the primary nav affordance. The toggle is secondary. Putting the toggle to the left of the hamburger keeps the hamburger in the thumb's natural resting zone (right edge) while making the toggle reachable. Reversing this would bury the hamburger one tap-target-width inward, which is annoying on small screens.

**Why no changes to `ThemeToggle`'s size:** it's already `h-10 w-10`. The hamburger is roughly 40px including padding. They match. No adjustment needed.

### 3.5 Mobile dropdown — dark variants, no toggle

The dropdown contents (Dashboard, Decks, Profile, Log Out) use `ResponsiveNavLink`, which gets its variants from §2.7. The _name/email block_ needs work:

```tsx
<div className="border-t border-gray-200 dark:border-gray-700 pb-1 pt-4">
    <div className="px-4">
        <div className="text-base font-medium text-gray-800 dark:text-gray-100">
            {user.name}
        </div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {user.email}
        </div>
    </div>
```

**Do not add a second `<ThemeToggle />` here.** One instance, one source of truth. The toggle is in the top bar, always visible.

---

## 4. Layer 3 — the page-level sweep

The component sweep (§2) fixed the pieces. This section fixes the pages that assemble them.

**Why pages need a separate section:** `04-features.md` §8.1 says "If a component looks wrong in dark mode, that's a bug." A page _is_ composed of components — if `Decks/Index` renders white cards on a dark page, the dark mode is incomplete, even though every component in it is correct. The sweep's actual requirement is "the app looks right in dark," and that's a property of pages, not components.

**Scope:** five pages, plus their partials.

- `Pages/Decks/Index.tsx`
- `Pages/Decks/Create.tsx`
- `Pages/Decks/Edit.tsx`
- `Pages/Decks/Show.tsx`
- `Pages/Profile/Edit.tsx`
- `Pages/Profile/Partials/UpdateProfileInformationForm.tsx`
- `Pages/Profile/Partials/UpdatePasswordForm.tsx`
- `Pages/Profile/Partials/DeleteUserForm.tsx`

**Out of scope, noted:**

- `Welcome.tsx` — rewritten in §5, with dark variants written in from the start.
- `GuestLayout.tsx` and all `Auth/*` pages — deferred to Day 7.
- `Pages/Dashboard.tsx` — removed entirely in §6, so it is not swept here.

### 4.1 The three recurring patterns

Six page files, but only three repeated problems. Fix the pattern, then apply per file.

**Pattern A — page header titles.**

`<h2 className="text-xl font-semibold leading-tight text-gray-800">` appears in `Decks/Index`, `Decks/Create`, `Decks/Edit`, `Decks/Show`, `Profile/Edit`. Fix:

```
className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100"
```

**Why `gray-100` and not `gray-200` or `gray-50`:** page headers are the most prominent text on the page. They should be at the same contrast level as `PrimaryButton`'s `dark:text-gray-900` on its light background — i.e., the highest-contrast text in the dark theme. `gray-100` is that level; `gray-200` starts to look muddy against `gray-900`, and `gray-50` is nearly white and causes halation.

**Pattern B — surface panels.**

`<div className="bg-white ... shadow-sm sm:rounded-lg">` appears in `Decks/Index` (EmptyState), `Decks/Create`, `Decks/Edit`, `Decks/Show` (×2), `Profile/Edit` (×3). Fix:

```
className="bg-white dark:bg-gray-800 ... shadow-sm sm:rounded-lg"
```

**Why every one gets `dark:bg-gray-800`:** this is the "surface" value from §1's palette. Panels are surfaces; every surface uses the same value. If any of them stayed white or went to `gray-900`, the depth hierarchy collapses — either a white rectangle floats on a dark page, or the panel disappears into the page background.

**Pattern C — muted body text.**

`text-gray-500` and `text-gray-600` appear throughout descriptions, helper text, and stat labels. Fix:

```
text-gray-500 dark:text-gray-400
text-gray-600 dark:text-gray-400
```

**Why both map to `gray-400` in dark:** on light, `gray-500` and `gray-600` are _visibly different_ — one is lighter (secondary), one is darker (tertiary). On dark, the visual range is compressed; `gray-500` and `gray-600` both become too dark to read against `gray-800`. Both need to lift to `gray-400`. The distinction between secondary and tertiary text is _lost_ in dark mode, which is acceptable — dark mode has less room for text hierarchy without sacrificing readability.

### 4.2 Per-file application

**`Pages/Decks/Index.tsx`:**

- Header title `<h2>` — Pattern A.
- "New deck" `<Link>`: `bg-gray-800 ... text-white` → add `dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white`. This is a `PrimaryButton`-styled link, so it follows the same inversion rule.
- `DeckCard` root: `bg-white ... shadow-sm` → `dark:bg-gray-800`.
- `DeckCard` title `<h3>`: `text-gray-900` → `dark:text-gray-100`.
- `DeckCard` description `<p>`: `text-gray-500` → Pattern C.
- `DeckCard` meta row `<div>`: `text-gray-500` → Pattern C.
- Due badge `<span>`: `bg-gray-100` → `dark:bg-gray-700`.
- `EmptyState` panel: Pattern B.
- `EmptyState` heading `<h3>`: `text-gray-900` → `dark:text-gray-100`.
- `EmptyState` body `<p>`: Pattern C.
- `EmptyState` CTA `<Link>`: same as "New deck" — `dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white`.

**`Pages/Decks/Create.tsx` and `Pages/Decks/Edit.tsx`:**

Identical structure, identical fixes:

- Header title `<h2>` — Pattern A.
- Surface panel — Pattern B.

That's it. The form itself is `DeckForm`, swept in §2.16.

**`Pages/Decks/Show.tsx`:**

- Header `<h2>` (deck name) — Pattern A.
- "Edit" link: `text-gray-500 hover:text-gray-700` → `dark:text-gray-400 dark:hover:text-gray-200`.
- "Delete" button: `text-red-600 hover:text-red-700` → `dark:text-red-400 dark:hover:text-red-300`.
- Description `<p>`: `text-gray-600` → Pattern C.
- Four `Stat` cards: `bg-white ... shadow-sm` → Pattern B.
- `Stat` label: `text-gray-500` → Pattern C.
- `Stat` value: `text-gray-900` → `dark:text-gray-100`.
- "Cards" heading `<h3>`: `text-gray-900` → `dark:text-gray-100`.
- Cards panel: Pattern B.
- Cards panel border: `border-gray-100` → `dark:border-gray-700`.
- Empty state `<div>` (the "No cards yet" text): `text-gray-500` → Pattern C.
- **Modal contents** (the delete confirmation): title `<h2>` `text-gray-900` → `dark:text-gray-100`; body `<p>` `text-gray-500` → Pattern C. The modal chrome itself is swept in §2.9.
- The disabled "Add card" and "Generate with AI" buttons: `border-gray-300 text-gray-400` → `dark:border-gray-600 dark:text-gray-500`. These are stubs. `day-03b` replaces the "Add card" stub with a live link; "Generate with AI" stays disabled until Day 4. Sweeping their dark variants now keeps them consistent until they're replaced.

**`Pages/Profile/Edit.tsx`:**

- Header title `<h2>` — Pattern A.
- Three surface panels — Pattern B (×3).

**`Pages/Profile/Partials/UpdateProfileInformationForm.tsx`:**

- Section title `<h2>`: `text-gray-900` → `dark:text-gray-100`.
- Description `<p>`: `text-gray-600` → Pattern C.
- Unverified notice `<p>`: `text-gray-800` → `dark:text-gray-200`.
- "Click here to re-send" `<Link>`: `text-gray-600 ... hover:text-gray-900` → `dark:text-gray-400 dark:hover:text-gray-100`.
- Focus ring: `focus:ring-offset-2` has no dark partner → add `dark:focus:ring-offset-gray-800`.
- Verification-sent message: `text-green-600` → `dark:text-green-400`.
- "Saved." `<p>`: `text-gray-600` → Pattern C.

**`Pages/Profile/Partials/UpdatePasswordForm.tsx`:**

- Section title `<h2>`: `text-gray-900` → `dark:text-gray-100`.
- Description `<p>`: `text-gray-600` → Pattern C.
- "Saved." `<p>`: `text-gray-600` → Pattern C.

**`Pages/Profile/Partials/DeleteUserForm.tsx`:**

- Section title `<h2>`: `text-gray-900` → `dark:text-gray-100`.
- Description `<p>`: `text-gray-600` → Pattern C.
- Modal title `<h2>`: `text-gray-900` → `dark:text-gray-100`.
- Modal body `<p>`: `text-gray-600` → Pattern C.

The buttons and inputs inside these partials are components, already swept.

### 4.3 Verification

Every logged-in page must be visited in both themes:

1. `/decks` (Index) — grid, empty state, both themes.
2. `/decks/create` — form, both themes.
3. Open an existing deck (`/decks/{id}`) — stats, card panel, delete modal, both themes.
4. `/decks/{id}/edit` — form, both themes.
5. `/profile` — all three form sections, both themes.
6. Open the account-delete modal — both themes.

The §4.2 patterns give us confidence, but patterns aren't proof. Visit each page.

---

## 5. Layer 4 — the Welcome page reduction

**What this is:** a content replacement, not a dark-mode sweep. The current `Welcome.tsx` is the stock Laravel landing page — Laravel logo, three marketing cards, version footer — and it already has dark variants. This section reduces it to three elements: title, slogan, navigation.

**Why this is part of `day-03a`:** the Welcome page is the app's public face. Its dark mode already works, so there's no sweep to do — but leaving it as a Laravel marketing page while the rest of the app becomes TOTES is incoherent. And because §6 removes Dashboard, the Welcome nav's logged-in branch has to change anyway. One coherent commit is better than three partial ones.

**The new `Welcome.tsx`:**

```tsx
import { PageProps } from "@/types";
import { Head, Link } from "@inertiajs/react";

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
                                href={route("decks.index")}
                                title={auth.user.name}
                                className="max-w-[12ch] truncate rounded-md px-3 py-2 text-sm transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-gray-300"
                            >
                                {auth.user.name}
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route("login")}
                                    className="rounded-md px-3 py-2 text-sm transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-gray-300"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={route("register")}
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
```

**Design decisions in this rewrite, and why:**

**"TOTES" appears twice** — once in the header, once as the hero title. This is deliberate. The header wordmark identifies the site on every page; the hero title announces it on the landing page. This is standard (Stripe, Linear, and Vercel all do it). If it feels redundant, delete the header wordmark and rely on the hero alone — but I'd keep both; the header gives the page a top edge, which a bare hero lacks.

**The slogan ends in `...`, not a full stop.** The handoff doc says the slogan is open-ended by design. On a landing page, the ellipsis _is_ the point — it invites the reader to complete the sentence, which is what the product is for. Don't add a completion.

**No footer.** The Laravel version footer is deleted. It served the stock landing page; it has no place on a product's public face.

**No images, no gradients, no icons.** You asked for minimal. This is minimal. The page's job is to say "TOTES exists" and route you to login/register. It does exactly that.

**The Register button is styled as a primary action; Log in is a text link.** On a landing page, the primary action is _sign up_, not _sign in_ — the person reading this page is most likely new. This is a small hierarchy decision with a real behavioral effect.

**The logged-in branch is `{auth.user.name}`, truncated at 12 characters.** `title={auth.user.name}` supplies the full name as a tooltip where hovering is possible.

**Dark mode is written in from the start.** `dark:bg-gray-900`, `dark:text-gray-100`, `dark:text-gray-400`, `dark:bg-gray-100` for the inverted Register button. No sweep needed later.

**The route closure keeps passing `laravelVersion` and `phpVersion`.** The new component does not use them. This is intentional for `day-03a`: removing them is a PHP change and `day-03a` is otherwise frontend-only except for §6's route edit. They can be pruned the next time `routes/web.php` is edited for another reason. Harmless unused props.

**Logged-in users are not blocked.** A logged-in user visiting `/` sees this page, with their name in the nav. Clicking it goes to their decks. Welcome is the public face, and blocking authenticated users from it is hostile for no benefit.

---

## 6. Layer 5 — removing Dashboard

**What this is:** Dashboard is a Breeze leftover. `04-features.md` does not mention it, `01-product-vision.md` does not mention it, and it contains one sentence: "You're logged in!" It is not a feature. It is a placeholder.

**Why now rather than later:** every page is swept in §4, checked for responsiveness on Day 7, and tested in `day-03b`. Removing a page that does nothing saves work on every future day. And its only current purpose — being the post-login destination — is already served by `/decks`.

### 6.1 Replace the route, don't delete it

**File:** `routes/web.php`

**Find:**

```php
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');
```

**Replace with:**

```php
Route::get('/dashboard', fn () => redirect()->route('decks.index'))
    ->middleware('auth')
    ->name('dashboard');
```

**Why redirect instead of deleting the route:** the route _name_ `dashboard` may still be referenced somewhere we haven't found — a cached Inertia response, a bookmark, a link in a file we didn't read. A redirect fails gracefully: the user lands on `/decks` and never knows anything was wrong. A deleted route throws "route not defined" and shows an error page. **The redirect is a safety net, not a feature.** When we're confident nothing references it, the route itself can be deleted.

**Why `auth` but not `verified`:** the `verified` middleware enforces email verification, which is off by default per `ENFORCE_EMAIL_VERIFICATION=false`. Decks don't require it. Keeping `verified` on the redirect would mean an unverified user hitting `/dashboard` gets bounced to `/verify-email` instead of landing on their decks — which is not the intent.

### 6.2 Remove the two nav links

**File:** `resources/js/Layouts/AuthenticatedLayout.tsx`

**Desktop nav — remove:**

```tsx
<NavLink href={route("dashboard")} active={route().current("dashboard")}>
    Dashboard
</NavLink>
```

**Mobile dropdown — remove:**

```tsx
<ResponsiveNavLink
    href={route("dashboard")}
    active={route().current("dashboard")}
>
    Dashboard
</ResponsiveNavLink>
```

After removal, "Decks" is the only nav link on both. That's correct — it's the only destination the product has.

### 6.3 Update the Welcome nav

**File:** `resources/js/Pages/Welcome.tsx`

Handled by §5 — the logged-in branch points at `route('decks.index')`, not `route('dashboard')`. No separate edit here; §5 already does it.

### 6.4 Delete the Dashboard page

**File:** `resources/js/Pages/Dashboard.tsx`

**Command:** `git rm resources/js/Pages/Dashboard.tsx`

**Order matters.** Run this **after** §6.1, §6.2, and §6.3 are applied. The invariant: no file references Dashboard when the file is deleted. If you delete it first, the next request to `/dashboard` fails at `Inertia::render('Dashboard')`, and any page rendering the nav fails at `route('dashboard')`. Edit first, delete last.

### 6.5 Verification

1. Log in. `git grep -n "dashboard"` (or your editor's search) — the only remaining reference should be the route name in `routes/web.php`.
2. Visit `/dashboard` — you land on `/decks`.
3. The nav on every page shows "Decks" only. No "Dashboard" link anywhere, desktop or mobile.
4. The mobile dropdown shows: Decks, Profile, Log Out. Nothing else.
5. Log out. Visit `/` — the Welcome page shows "Log in" and "Register". Log back in. Visit `/` — the nav shows your name, truncated at 12 characters, and clicking it goes to `/decks`.

---

## 7. Verification

Do not commit until all of these pass.

### 7.1 Automated

```bash
npm run build
```

**Why:** the production Vite build type-checks and will fail on any TypeScript error introduced by the edits. `npm run dev` doesn't always surface type errors immediately.

Then:

```bash
php artisan test
```

**Why:** §6 edits `routes/web.php`. Any test asserting on the Dashboard route (there shouldn't be one, but verify) will fail. The rest should pass unchanged.

### 7.2 Manual — light mode

Log in. Walk through:

1. Decks index loads, looks unchanged.
2. Open a deck. Looks unchanged.
3. Open the create-deck form. Looks unchanged.
4. Open the icon picker. Click an icon. Ring appears correctly.
5. Open the color picker. Click a swatch. Ring appears correctly.
6. Open the user dropdown (top right). Items readable.
7. Open a modal (e.g., click Delete on a deck, cancel). Panel readable, overlay correct.
8. Tab through the create-deck form. Every focus ring is visible.

### 7.3 Manual — dark mode

Click the theme toggle to dark. Repeat all eight checks above. Specifically watch for:

- White boxes where there shouldn't be (dropdown, modal, icon picker).
- White halos around focused elements (the ring-offset problem).
- Text that's disappeared (nav links, labels, muted text).
- The logo — should be light-on-dark, not dark-on-dark.

Then the page sweep (from §4.3):

1. `/decks` (Index) — grid, empty state.
2. `/decks/create` — form, type into both fields. Text must be readable.
3. Open an existing deck (`/decks/{id}`) — stats, card panel, delete modal.
4. `/decks/{id}/edit` — form.
5. `/profile` — all three form sections.
6. Open the account-delete modal.

Then:

9. Tab out of a field. Focus ring must be visible, no white halo.
10. Click Cancel. The `SecondaryButton` must read as a button, not as a white rectangle.

**Note on the login page:** `GuestLayout` and the `Auth/*` pages are **out of scope**. If login looks wrong in dark, that's expected — Day 7's responsiveness pass handles it.

### 7.4 Manual — mobile

Resize to mobile (Chrome DevTools device toolbar, iPhone SE or similar — 375px wide). In dark mode:

- Top bar shows: logo (left), then on the right: theme toggle, then hamburger.
- Tap the theme toggle. It cycles light → dark → system.
- Tap the hamburger. Menu opens. Dashboard is **gone**. Decks, Profile, Log Out all readable.
- **No second theme toggle inside the menu.**

### 7.5 Manual — Welcome and Dashboard

1. Log out. Visit `/` — the Welcome page shows: "TOTES" (header), the slogan "The only time education sucks is when...", and "Log in" + "Register".
2. Toggle to dark. The page renders correctly in both themes.
3. Visit `/dashboard` while logged out — you're redirected to login (auth middleware).
4. Log back in. Visit `/` — the nav shows your name (truncated at 12 characters if longer), clicking it goes to `/decks`.
5. Visit `/dashboard` while logged in — you land on `/decks`.

---

## 8. Commit

One commit. Message:

```
Day 3a: dark mode sweep, mobile theme toggle, Welcome reduction, Dashboard removal

- Add dark: variants across 16 components and 9 page files using the
  gray-900/800/700/600/100/400 palette
- Move ThemeToggle into the mobile top bar (top-bar only, single instance)
- Fix Day 2 regressions: IconPicker, ColorPicker, DeckForm inline classes
- Reduce Welcome.tsx to title, slogan, and nav; open-ended slogan preserved
- Remove Dashboard: route redirects to /decks, page file deleted,
  nav links removed

Refs: 04-features.md §8.1, §1.2
```

**Why one commit and not four:** the app has intermediate states that don't work. If the sweep commits separately from the Welcome reduction, then between them the Welcome page still says "Dashboard" while the nav has lost its Dashboard link — an inconsistent state. Committing everything together means the only visible states are "before Day 3a" and "after Day 3a," both coherent.

---

## 9. What could go wrong

| Symptom                                              | Cause                                                                          | Fix                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `indigo-950` doesn't render                          | Tailwind < 3.3                                                                 | Swap to `indigo-900` in `ResponsiveNavLink`                    |
| White halo around focused element                    | Missing `dark:focus:ring-offset-*`                                             | Add it; check the palette table                                |
| Modal panel still white                              | Missed `dark:bg-gray-800` on `DialogPanel`                                     | §2.9                                                           |
| Logo invisible in dark                               | Missed `dark:text-gray-100` on `ApplicationLogo` in layout                     | §3.2                                                           |
| Toggle works but page doesn't change                 | `applyTheme` not running; check `app.blade.php` pre-paint script still present | Pre-existing, not from this sweep                              |
| Two toggles on mobile                                | Added `<ThemeToggle />` inside the dropdown by mistake                         | Remove it; §3.5                                                |
| Tests fail after sweep                               | An assertion checks rendered class strings or the Dashboard route              | Read the failure; likely a test asserting `bg-white` literally |
| `truncate` does nothing on the Welcome nav name      | Element has no bounded width                                                   | The `max-w-[12ch]` in §5 supplies it; both are required        |
| `/dashboard` throws "route not defined"              | Route was deleted instead of redirected                                        | §6.1 — keep the route, redirect it                             |
| Inertia error "page component not found: Dashboard"  | `Dashboard.tsx` deleted before the route was changed                           | §6.4 — delete last, after §6.1–§6.3                            |
| Nav still shows "Dashboard" link                     | Missed one of the two locations (desktop vs mobile)                            | §6.2 removes both                                              |
| Welcome page shows a name with no tooltip on desktop | Missing `title` attribute                                                      | §5 includes `title={auth.user.name}`                           |

---

## 10. What this manual deliberately does not do

- **No new components.** The sweep is edits, not additions.
- **No refactoring.** `DeckForm`'s raw `<textarea>` and `<input>` stay inline; the refactor to use `TextInput`/`Checkbox` is Day 7. `Dropdown.tsx`'s awkward structure stays. Day 7 is the polish pass.
- **No `Decks/Show.tsx` card list work.** That's `day-03b`.
- **No backend changes beyond §6.1's route edit.** Zero other PHP files touched.
- **No `@tailwindcss/vite` cleanup.** That's the Day 7 item noted in `SESSION-STATE.md`. The package is present but not imported — harmless until then.
- **No `GuestLayout` or `Auth/*` sweep.** Deferred to Day 7.
- **No mobile responsiveness pass beyond the toggle.** The full pass is Day 7. This manual checks the toggle and the page sweep at mobile width; it does not audit every page at every breakpoint.
- **No pruning of unused `laravelVersion`/`phpVersion` props.** They stay in the route closure. Pruned when `routes/web.php` is next edited for another reason.

If you find yourself wanting to do any of the above mid-sweep, stop. Note it. Do it on the scheduled day.

---

**End of manual.**
