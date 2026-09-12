# TOTES — Day 1 Operations Manual

> Foundation setup. By the end of today, TOTES is a running Laravel 11 app
> with Breeze auth, Tailwind dark mode, five migrations, four models with
> relationships, the folder scaffold for Services/Controllers, and a green
> test suite. No product features yet. Just the floor we stand on.

**Estimated time:** 2–4 hours, depending on how much we stop to read errors.

---

## Guiding principle for today

We build in dependency order. Each step assumes the previous one succeeded.
If a step fails, we stop and fix it — we do not skip ahead "to save time."
Skipping ahead in a foundation is how you spend Day 4 debugging Day 1.

At two points, marked **PAUSE**, I want you to paste the command output back
to me before continuing. Those are the steps where a silent wrong turn costs
us real time later.

---

## Step 1 — Confirm we're in the right place

```bash
cd ~/Desktop/main\ works/totes
pwd
git status
```

**Why:** We just verified this works, but every command below assumes this
directory. Confirm it now so a typo doesn't send Composer into the wrong
folder.

**Expected:** `pwd` ends in `totes`. `git status` shows a clean tree on
`main` (or only `SESSION-STATE.md` as untracked — that's fine, we'll commit
it at the end of today).

If `git status` shows anything else untracked, tell me before we continue.

---

## Step 2 — Create the Laravel project safely

This is the step I flagged. We do **not** run `composer create-project` inside
`totes/` — that would either fail or risk clobbering your `docs/` and `.git`.

**The safe route:** create Laravel in a temporary sibling folder, then move
its contents into `totes/`. Nothing existing gets touched.

### 2a. Move up one level

```bash
cd ..
pwd
```

**Expected:** `pwd` ends in `Desktop/main works` (the parent of `totes`).

### 2b. Create Laravel in a temp folder

```bash
composer create-project laravel/laravel totes-temp
```

**Why the temp name:** It gives us a disposable target. If something goes
wrong, we delete `totes-temp/` and start over without touching `totes/`.

**What this does:** Downloads Laravel 11, runs `composer install`, generates
`.env`, generates an app key, sets up the default `database/` folder,
`routes/`, `config/`, etc.

**Expected:** A long Composer output ending with something like:

```
> @php artisan key:generate --ansi
Application key set successfully.
```

If it fails, paste the last 20 lines and we'll debug before moving on.

### 2c. Move Laravel's contents into `totes/`

We use `rsync`-style copying, but Windows Git Bash doesn't ship `rsync` by
default. So we do it with `cp` + explicit excludes, then delete the temp.

**First, a dry-run to see what would move:**

```bash
ls -la totes-temp/
```

Confirm you see `.env`, `app/`, `bootstrap/`, `composer.json`, `config/`,
`database/`, `public/`, `resources/`, `routes/`, `storage/`, `tests/`,
`vendor/`, plus a fresh `.git` and `.gitignore` and `.gitattributes`.

**Now the copy — one command, with reasoning:**

```bash
cp -rn totes-temp/. totes/
```

- `-r` recursive (directories)
- `-n` **no-clobber** — this is the safety valve. It will NOT overwrite files
  that already exist in `totes/`. So your `README.md`, your `docs/`, and
  your `.git/` survive untouched. Laravel's fresh `.gitignore` will NOT
  overwrite anything existing either.

**Expected:** No output. Silence means success.

**Verify the merge:**

```bash
cd totes
ls -la
git status
```

You should see the Laravel folders (`app/`, `bootstrap/`, etc.) now sitting
alongside `docs/`, `README.md`, and `.git/`.

`git status` will show a lot of new untracked files — that's expected. We
commit them at the end of Day 1.

### 2d. Delete the temp folder

```bash
cd ..
rm -rf totes-temp
cd totes
pwd
```

**Expected:** `pwd` ends in `totes`. `ls ../` should no longer show
`totes-temp/`.

**PAUSE.** Paste the output of `ls -la` and `git status --short | head -30`
back to me. I want to confirm the merge is clean before we run anything
Laravel-related, because a half-merged project is a nightmare to diagnose
later. Do not proceed to Step 3 until I confirm.

---

## Step 3 — Verify Laravel boots

Before we add anything, we prove the base install works.

```bash
php artisan --version
```

**Expected:** `Laravel Framework 11.x.x`

```bash
php artisan about
```

**Expected:** A tidy summary showing Environment, Cache, Drivers. Look for:

- **Environment:** `local`
- **Debug Mode:** `ENABLED` (fine for now)
- **Database:** will say `mysql` — but this is just config, not a connection.

If `php artisan --version` fails, the merge in Step 2 is broken. Tell me.

---

## Step 4 — Configure the `.env` for MariaDB

Open `.env` in your editor (VS Code is fine). Find these lines and change
them:

```
APP_NAME=TOTES
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=totes
DB_USERNAME=root
DB_PASSWORD=
```

**Why `127.0.0.1` and not `localhost`:** On Windows, PHP sometimes resolves
`localhost` to the IPv6 `::1` first, and XAMPP's MariaDB listens on IPv4.
Using `127.0.0.1` forces IPv4 and avoids a class of "why won't it connect"
errors. This is a real Windows gotcha, not a superstition.

**Why empty password:** XAMPP ships with `root` and no password. Fine for
local dev. We never do this in production — and Railway's MySQL will have a
generated password, which is why the `.env` is environment-specific.

**Also add these now** (they aren't in Laravel's default `.env.example`, so
add them under the DB block):

```
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

AI_DAILY_LIMIT=10
AI_MAX_INPUT_CHARS=5000
```

Leave `GROQ_API_KEY` empty for now — we don't need it until Day 4. Adding
the keys now means Day 4 is a one-line change, not a "wait, where does this
go" detour.

**Mirror these into `.env.example`** too (with the same empty values), so
the file committed to the repo documents the contract.

---

## Step 5 — Create the database

XAMPP's MySQL service must be running. Check the Control Panel first.

Then, in Git Bash:

```bash
/c/xampp/mysql/bin/mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS totes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**Why `utf8mb4`:** Laravel 11 defaults to it. It stores emoji and full
Unicode correctly, unlike the older `utf8`. There's no reason to use
anything else in 2026.

**Why `utf8mb4_unicode_ci` and not `utf8mb4_0900_ai_ci`:** The `_0900_ai_ci`
collation is MySQL-8-specific. MariaDB 10.4 doesn't have it. Using
`utf8mb4_unicode_ci` keeps local (MariaDB) and production (MySQL 8) aligned.
This is one of the MariaDB-vs-MySQL edges I warned you about — and this
choice defuses it.

**Verify:**

```bash
/c/xampp/mysql/bin/mysql.exe -u root -e "SHOW DATABASES LIKE 'totes';"
```

**Expected:**

```
+------------------+
| Database (totes) |
+------------------+
| totes            |
+------------------+
```

---

## Step 6 — Install Breeze (React + TypeScript)

Breeze is Laravel's official minimal auth scaffold. The React+TS preset
gives us register/login/logout/email-verification pages already typed.

```bash
composer require laravel/breeze --dev
php artisan breeze:install react --typescript
```

**What the installer asks / does:**

- It will ask whether to run `npm install` and `npm run build` automatically —
  **say yes.** It saves a step.
- It will ask about dark mode — Breeze's default gives us a Tailwind setup
  we'll adjust in Step 7.
- It will ask about PHPUnit vs Pest — **choose PHPUnit.** Laravel 11 defaults
  to Pest, but your architecture doc says PHPUnit-style tests, and mixing
  the two is a distraction. Stay with PHPUnit.

**Expected at the end:** `npm run build` succeeds, and you see something like
`vite v5.x.x building for production...`.

**PAUSE.** Paste:

```bash
git status --short
ls resources/js/Pages/Auth/
```

I want to confirm Breeze laid down its pages before we configure dark mode
on top of them.

---

## Step 7 — Configure Tailwind dark mode

Breeze already installs Tailwind and a base config. We tell Tailwind to use
the **class strategy** — dark mode toggled by adding `class="dark"` to
`<html>`, not by the OS preference.

Open `tailwind.config.js`. Find `darkMode` (it may be missing). It must be:

```js
export default {
  darkMode: "class",
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
    "./resources/**/*.ts",
    "./resources/**/*.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Why `'class'` over `'media'`:** With `'media'`, the OS decides. With
`'class'`, the app decides. TOTES has a `theme` column on `users` — meaning
the user's choice must persist across devices. That requires `'class'`,
because we can set the class server-side based on the user's stored
preference. This is a one-word change with real product consequences.

---

## Step 8 — Create the migrations

Five migrations. Four are new tables; one modifies `users`.

Generate them with Laravel's artisan so the timestamps are correct:

```bash
php artisan make:migration add_theme_to_users_table
php artisan make:migration create_decks_table
php artisan make:migration create_cards_table
php artisan make:migration create_review_logs_table
php artisan make:migration create_ai_usage_logs_table
```

Now edit each file. Here's what goes in each.

### `..._add_theme_to_users_table.php`

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('theme', 10)->default('system')->after('password');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('theme');
    });
}
```

**Why a string and not an enum:** Enums in MySQL are painful to alter later.
A short string with a validated set (`system`, `light`, `dark`) enforced at
the form-request layer is more flexible. If we ever add a theme, it's a code
change, not a migration.

### `..._create_decks_table.php`

```php
public function up(): void
{
    Schema::create('decks', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->string('name');
        $table->text('description')->nullable();
        $table->string('icon', 50)->nullable();
        $table->string('color', 20)->default('blue');
        $table->boolean('shuffle_default')->default(false);
        $table->timestamps();

        $table->index(['user_id', 'created_at']);
    });
}
```

**Why the index on `(user_id, created_at)`:** The Decks index page queries
"all decks for this user, newest first." That's exactly what this composite
index serves. Without it, we do a full scan on every page load.

**Why `cascadeOnDelete()`:** If a user is deleted, their decks go with them.
No orphans. Same reasoning applies below.

### `..._create_cards_table.php`

```php
public function up(): void
{
    Schema::create('cards', function (Blueprint $table) {
        $table->id();
        $table->foreignId('deck_id')->constrained()->cascadeOnDelete();
        $table->text('front');
        $table->text('back');
        $table->text('explanation')->nullable();

        // SM-2 scheduling state
        $table->decimal('ease_factor', 4, 2)->default(2.50);
        $table->unsignedInteger('interval')->default(0);           // days
        $table->unsignedInteger('repetitions')->default(0);
        $table->timestamp('due_at')->nullable();
        $table->timestamp('last_reviewed_at')->nullable();

        $table->timestamps();

        $table->index(['deck_id', 'due_at']);
    });
}
```

**Why `decimal(4,2)` for ease factor:** SM-2 ease starts at 2.50 and can
range roughly 1.30–2.80. `decimal(4,2)` stores 2.50 exactly. A float would
store 2.4999999... and drift over hundreds of reviews. This is the kind of
choice that's invisible until month three, when a bug report says "interval
keeps growing" and you realize your ease factor accumulated rounding error.

**Why `due_at` is nullable:** A card that has never been reviewed isn't
"due" in the SM-2 sense — it's "new." Nullable lets us distinguish "never
scheduled" from "scheduled and now past due."

**Why the `(deck_id, due_at)` index:** Study mode's core query is "give me
the next due card in this deck." Indexed.

### `..._create_review_logs_table.php`

```php
public function up(): void
{
    Schema::create('review_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('card_id')->constrained()->cascadeOnDelete();
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->string('rating', 10);                 // again|hard|good|easy
        $table->unsignedInteger('interval_before');   // days
        $table->unsignedInteger('interval_after');    // days
        $table->timestamp('reviewed_at');

        $table->index(['user_id', 'reviewed_at']);
        $table->index(['card_id', 'reviewed_at']);
    });
}
```

**Why we store both `interval_before` and `interval_after`:** Session
analysis needs to say "you went from 3 days to 14 days on this card." Without
`interval_before`, we can't reconstruct that story. It's a small column with
a real product payoff.

**Why `rating` is a string not an int:** Readability in the DB. `'good'` is
self-documenting; `2` is not. We enforce the set at the application layer.
Storage cost is negligible.

### `..._create_ai_usage_logs_table.php`

```php
public function up(): void
{
    Schema::create('ai_usage_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->cascadeOnDelete();
        $table->string('operation', 30);              // generate|analyze
        $table->unsignedInteger('input_chars');
        $table->unsignedInteger('output_tokens')->nullable();
        $table->timestamp('created_at')->useCurrent();

        $table->index(['user_id', 'created_at']);
    });
}
```

**Why no `updated_at`:** Logs are append-only. `created_at` only. The
`useCurrent()` means the DB sets it, so we can't forget to in code.

**Why the `(user_id, created_at)` index:** The rate limit check is literally
`SELECT COUNT(*) FROM ai_usage_logs WHERE user_id = ? AND created_at >= ?`.
That's the query this index serves. The rate limit runs on every AI call;
making it fast is non-optional.

---

## Step 9 — Run the migrations

XAMPP's MySQL should still be running.

```bash
php artisan migrate
```

**Expected:** Five migrations run, no errors. You'll see a table like:

```
   INFO  Running migrations.

  0001_01_01_000000_create_users_table ....................... DONE
  0001_01_01_000001_create_cache_table ....................... DONE
  ...
  2026_09_12_XXXXXX_add_theme_to_users_table ................. DONE
  2026_09_12_XXXXXX_create_decks_table ....................... DONE
  ...
```

**If a migration fails,** paste the exact error. The most likely MariaDB
quirk is a charset or collation complaint — but since we chose
`utf8mb4_unicode_ci`, this should be fine.

**Verify in the DB:**

```bash
/c/xampp/mysql/bin/mysql.exe -u root totes -e "SHOW TABLES; DESCRIBE cards;"
```

Confirm `cards` has the `ease_factor decimal(4,2)` column, and `due_at` is
nullable. This is the moment to catch a migration typo — not Day 5.

---

## Step 10 — Define the models

Four models. `User` already exists from Laravel; we edit it. The other three
we create with artisan so the boilerplate is correct.

```bash
php artisan make:model Deck
php artisan make:model Card
php artisan make:model ReviewLog
php artisan make:model AiUsageLog
```

### `app/Models/User.php` — add the relationships

Add inside the class:

```php
public function decks(): HasMany
{
    return $this->hasMany(Deck::class);
}

public function reviewLogs(): HasMany
{
    return $this->hasMany(ReviewLog::class);
}

public function aiUsageLogs(): HasMany
{
    return $this->hasMany(AiUsageLog::class);
}
```

And add `use Illuminate\Database\Eloquent\Relations\HasMany;` at the top.

**Also** add `theme` to the `$fillable` array. It's a user-settable field.

### `app/Models/Deck.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deck extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'description', 'icon', 'color', 'shuffle_default',
    ];

    protected $casts = [
        'shuffle_default' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(Card::class);
    }
}
```

**Why `$casts`:** `shuffle_default` comes out of MySQL as `0` or `1`. The
cast makes it a real PHP `bool`. Without it, `if ($deck->shuffle_default)`
works by accident — `0` is falsy — but `$deck->shuffle_default === false`
fails. Casting makes the type honest.

### `app/Models/Card.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Card extends Model
{
    use HasFactory;

    protected $fillable = [
        'deck_id', 'front', 'back', 'explanation',
        'ease_factor', 'interval', 'repetitions',
        'due_at', 'last_reviewed_at',
    ];

    protected $casts = [
        'ease_factor'      => 'float',
        'interval'         => 'integer',
        'repetitions'      => 'integer',
        'due_at'           => 'datetime',
        'last_reviewed_at' => 'datetime',
    ];

    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class);
    }

    public function reviewLogs(): HasMany
    {
        return $this->hasMany(ReviewLog::class);
    }
}
```

**Why cast `ease_factor` to `float` and not `decimal`:** Laravel doesn't have
a first-class decimal cast that preserves precision across all drivers. In
practice, PHP floats are fine for SM-2 arithmetic at our scale. The column
stays `decimal(4,2)` in the DB — that's where precision lives. The cast is
for convenience.

If we ever see ease-factor drift, we revisit and use a value object. For now,
honest and simple.

### `app/Models/ReviewLog.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'card_id', 'user_id', 'rating',
        'interval_before', 'interval_after', 'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

**Why `$timestamps = false`:** This table only has `created_at`-equivalent
(`reviewed_at`), which we set explicitly. Laravel's default `created_at` /
`updated_at` pair would fight the schema. Disabling is honest.

### `app/Models/AiUsageLog.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'operation', 'input_chars', 'output_tokens', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

---

## Step 11 — Scaffold the folder structure

Empty folders and interface stubs. No logic yet — this just makes Day 2 start
with the right bones.

```bash
mkdir -p app/Http/Controllers/Web
mkdir -p app/Http/Controllers/Api/V1
mkdir -p app/Services/Ai/DTO
mkdir -p app/Services/SpacedRepetition
mkdir -p app/Support
```

**On Windows:** `mkdir -p` works in Git Bash. If you ever drop to PowerShell,
it's `New-Item -ItemType Directory -Force`.

**On the `DTO` casing:** PascalCase, matching the rest of your namespaces.
`App\Services\Ai\DTO`, not `dto`.

Create empty interface stubs so the namespace exists:

```bash
touch app/Services/Ai/AiClientInterface.php
touch app/Services/SpacedRepetition/Sm2Scheduler.php
touch app/Services/SpacedRepetition/ReviewRating.php
```

We won't write them today. They're placeholders so Day 2's `git status` shows
the intended shape.

**Also** create the ADR folder if it doesn't exist:

```bash
mkdir -p docs/adr
```

And at some point today, edit `02-architecture.md` to change `dto/` to `DTO/`.
One-line edit. Do it whenever.

---

## Step 12 — Verify end-to-end (the important one)

Three things must work:

### 12a. Auth flow

```bash
npm run dev
```

In another terminal:

```bash
php artisan serve
```

Open `http://localhost:8000` in a browser. You should see Laravel's welcome
page. Click through to `/register`, create an account, and land on the
dashboard. This confirms Breeze, Inertia, React, Vite, and the database all
work together.

**Kill both processes when done** (Ctrl+C in each terminal). We don't leave
dev servers running between sessions.

### 12b. Tests pass

```bash
php artisan test
```

**Expected:** Breeze ships two example tests. Both green. If any fail, paste
the output — the usual cause is a misconfigured `phpunit.xml` environment,
which is a two-minute fix.

### 12c. Tinker check

```bash
php artisan tinker
```

Then:

```php
>>> App\Models\User::count();
=> 1
>>> App\Models\Deck::count();
=> 0
>>> exit
```

This proves the models are wired to the DB and Eloquent sees the tables.

---

## Step 13 — Commit

Only after all of 12a–12c are green.

```bash
git add .
git status
```

**Review the list.** It should include:

- `app/`, `bootstrap/`, `config/`, `database/`, `public/`, `resources/`,
  `routes/`, `storage/`, `tests/`, `vendor/`, all of Laravel
- The five migration files
- The four model files
- Breeze's `Pages/Auth/*` files
- `.env.example` with our added keys
- `SESSION-STATE.md` if it was untracked

**It should NOT include:**

- `.env` (must be gitignored — check!)
- `node_modules/` (gitignored)
- `vendor/` — **wait, this is important:** Laravel's default `.gitignore`
  does ignore `vendor/`. Confirm it does. We commit `composer.json` and
  `composer.lock`, not the vendor directory.

If `git status` shows `.env` or `vendor/` as untracked, stop and tell me.
That means the `.gitignore` didn't survive the merge in Step 2 — which is
fixable, but we fix it before committing.

Commit:

```bash
git commit -m "Day 1: Laravel 11 + Breeze + migrations + models scaffold"
git push
```

---

## Step 14 — Update SESSION-STATE.md

Per the protocol at the bottom of that file:

- **Last updated:** change to Day 1 evening, today's date.
- **Current Status:** Day 1 complete. Day 2 begins next session.
- **What's Done:** check off the Day 1 items.
- **What's Next:** Day 2 — Deck CRUD + icon picker + dark mode.
- **Notes for Next Session:** add anything notable (MariaDB quirks hit, the
  DTO casing fix, the `127.0.0.1` decision).
- **Day Counter:** mark Day 1 ✅ Done, Day 2 ⏳ Next.

Then:

```bash
git add docs/SESSION-STATE.md docs/02-architecture.md
git commit -m "Update session state: end of Day 1"
git push
```

---

## What "done" looks like

- `php artisan serve` + `npm run dev` gives you a working app in the browser
- You can register and log in
- `php artisan test` is green
- Five new migrations ran cleanly against MariaDB
- Four models exist with relationships
- The folder scaffold for Day 2+ is in place
- `git log` shows two commits for today
- `.env` and `vendor/` are NOT in the repo

If any of those is false, we're not done. No "we'll fix it tomorrow."

---

## What I'm deliberately NOT doing today

- No SM-2 logic (`Sm2Scheduler` is a stub)
- No AI client (`AiClientInterface` is empty)
- No controllers beyond what Breeze ships
- No React pages beyond what Breeze ships
- No routes beyond Laravel's defaults

Every one of those has a day. Today is the floor, not the furniture.
