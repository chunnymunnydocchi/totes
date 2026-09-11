# 09 — Deployment

> This document defines how TOTES gets from a local development environment to a publicly accessible URL. It covers Railway (primary), InfinityFree (fallback), environment configuration, and post-deploy verification.

**Core principle:** Deploy late. Features first, deployment last. A portfolio project's value is in the working app, not the deployment pipeline.

---

## Overview

| Aspect            | Choice                                                          |
| ----------------- | --------------------------------------------------------------- |
| Primary host      | Railway                                                         |
| Fallback host     | InfinityFree (manual, FileZilla-based)                          |
| Database          | Railway MySQL                                                   |
| Mail (production) | Resend                                                          |
| Domain            | Railway-provided `*.up.railway.app` (custom domain is optional) |
| TLS               | Automatic via Railway edge (Let's Encrypt)                      |

---

## 1. Railway — Primary Host

### 1.1 Why Railway

- **Laravel-friendly.** Railway has official Laravel templates [citation:1][citation:2] and handles PHP runtime provisioning.
- **GitHub-based deploys.** Push to `main`, Railway rebuilds and redeploys.
- **Managed MySQL.** Provisioned as a service in the same project, connected via environment variables.
- **Automatic TLS.** Railway issues Let's Encrypt certificates for `*.up.railway.app` domains [citation:7].
- **Free tier for portfolio use.** $5 credit for 30 days, then a limited free plan [citation:15].

### 1.2 The Free Tier Reality

**What you get on signup:** $5 in usage credits, valid for 30 days [citation:15].

**After the trial (or after $5 is spent):**

- Free plan continues at roughly **$1/month** in non-rollover credits [citation:15].
- Resources: up to **1 vCPU and 0.5 GB RAM per service** [citation:15].
- This is **enough for a small Laravel app with a MySQL database**, but tight.

**The risk:** If your app uses more than $1/month, it may be suspended when credits run out. The app goes offline until the next cycle.

**Mitigation plan:**

1. **Build and test locally first.** Deploy on Day 8, not Day 1.
2. **Monitor usage** in Railway's dashboard during the first week after deploy.
3. **If it exceeds $1/month:** Either pay **$5/month for the Hobby plan** (stays online reliably) or **migrate to InfinityFree** (free, but manual deployment pain — see §3).

**For a portfolio demo that recruiters might click at any time**, paying $5/month for the Hobby plan is the reliable path. But test the free tier first — it may be sufficient.

### 1.3 Setup Steps

**Prerequisites:**

- GitHub account with the TOTES repo pushed.
- Railway account (sign up with GitHub).

**Step 1 — Create the project.**

1. Go to `railway.app` → New Project.
2. Select **"Deploy from GitHub repo"**.
3. Choose the TOTES repository.

Railway will attempt a build. It will likely fail the first time because environment variables aren't set. That's expected.

**Step 2 — Add MySQL.**

1. In the project dashboard, click **New Service** → **Database** → **MySQL**.
2. Railway provisions the database and exposes connection variables (`MYSQLHOST`, `MYSQLPORT`, etc.).

**Step 3 — Configure environment variables.**

Go to the Laravel service → Variables. Add:

```
APP_NAME=TOTES
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:<your-key-from-local>
APP_URL=https://<your-railway-domain>

DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

GROQ_API_KEY=<your-groq-key>
GROQ_MODEL=llama-3.3-70b-versatile

RESEND_API_KEY=<your-resend-key>
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=onboarding@resend.dev
MAIL_FROM_NAME=TOTES

AI_DAILY_LIMIT=10
AI_MAX_INPUT_CHARS=5000

SANCTUM_STATEFUL_DOMAINS=<your-railway-domain>

ENFORCE_EMAIL_VERIFICATION=false
```

**Note on `${{MySQL.*}}`:** Railway's variable references pull values from the MySQL service automatically. No manual copying of credentials.

**Step 4 — Set the start command.**

Railway needs to know how to run the app. In the Laravel service settings, set:

- **Build Command:** `composer install --no-dev --optimize-autoloader && npm ci && npm run build`
- **Start Command:** `php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT`

**Alternative (recommended for production):** Use a FrankenPHP or Nginx+PHP-FPM setup [citation:1][citation:2]. But for a portfolio demo, `php artisan serve` is sufficient and simpler.

**Step 5 — Deploy.**

Push to `main`. Railway builds and deploys. The first deploy takes 3–5 minutes.

**Step 6 — Run migrations.**

Migrations run via the `migrate --force` command in the start command. Alternatively, use the Railway CLI:

```bash
railway run --service <laravel-service> php artisan migrate
```

### 1.4 Environment Variables Reference

| Variable                   | Source                                         | Notes                                                   |
| -------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `APP_KEY`                  | Generated locally (`php artisan key:generate`) | Copy the value from your local `.env`                   |
| `GROQ_API_KEY`             | `console.groq.com/keys`                        | Starts with `gsk_` [citation:11]                        |
| `RESEND_API_KEY`           | `resend.com/api-keys`                          | Starts with `re_` [citation:12]                         |
| `MAIL_MAILER`              | Set to `resend`                                | Laravel 11 has first-class Resend support [citation:12] |
| `SANCTUM_STATEFUL_DOMAINS` | Your Railway domain                            | Required for Sanctum SPA auth                           |

### 1.5 Security Headers — Railway Edge vs. Middleware

**Preferred:** Configure headers at Railway's edge. Railway terminates TLS at the platform proxy [citation:14], so transport-level headers belong there.

**If Railway edge config fails or is unavailable:** Use a Laravel middleware fallback.

Create `app/Http/Middleware/SecurityHeaders.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        // CSP — permissive for Vite builds
        $response->headers->set('Content-Security-Policy',
            "default-src 'self'; " .
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " .
            "style-src 'self' 'unsafe-inline'; " .
            "img-src 'self' data: https://api.iconify.design; " .
            "connect-src 'self'; " .
            "font-src 'self';"
        );

        return $response;
    }
}
```

Register it in `bootstrap/app.php` (Laravel 11 style):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->web(append: [
        \App\Http\Middleware\SecurityHeaders::class,
    ]);
})
```

**Note:** `'unsafe-inline'` and `'unsafe-eval'` for scripts may be required by Vite's development build. If a stricter CSP works with the production build, tighten it later. Documented as a TODO.

---

## 2. Local Development Setup (Pre-Deploy)

Before deploying, ensure the local environment matches production.

### 2.1 Local Mail — Mailpit

Instead of sending real emails locally, use **Mailpit**:

```bash
# macOS (Homebrew)
brew install mailpit
mailpit

# Windows (via scoop)
scoop install mailpit
mailpit
```

Mailpit runs on `http://localhost:8025`. Configure Laravel:

```env
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
```

All outgoing emails appear in Mailpit's UI. Nothing leaves your machine.

### 2.2 Local Database

MySQL locally. Either:

- Install MySQL directly.
- Use **DBngin** (free GUI for MySQL/Postgres).
- Use Laravel Herd (bundles MySQL).

The database name should be `totes` to match production.

---

## 3. InfinityFree — Fallback Host

If Railway's free tier proves insufficient and you don't want to pay $5/month, InfinityFree is the fallback. It's free, supports PHP and MySQL, and you have prior experience with it.

**But it's painful.** From the InfinityFree forum and community guides:

| Constraint                 | Impact                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| No SSH, no `php artisan`   | You cannot run migrations or artisan commands on the server [citation:13]                   |
| No Composer on server      | `vendor/` must be uploaded pre-built [citation:13]                                          |
| `open_basedir` restriction | PHP can only read files inside `htdocs/` — Laravel's default structure breaks [citation:13] |
| No symlinks                | `php artisan storage:link` doesn't work [citation:13]                                       |
| File Manager upload limits | `vendor/` (30–50MB) must be split into ZIPs [citation:13]                                   |
| FTP unreliable             | FileZilla may disconnect; use the browser File Manager [citation:5][citation:13]            |

### 3.1 The Preparation Steps

**Step 1 — Generate APP_KEY locally.**

```bash
php artisan key:generate --show
```

Copy the output (starts with `base64:`). You'll paste it into `.env` manually — InfinityFree has no artisan.

**Step 2 — Set production `.env` values locally.**

Edit your local `.env` to match production (APP_ENV=production, InfinityFree DB credentials, etc.). This `.env` will be uploaded.

**Step 3 — Package the project into two ZIPs.**

The `vendor/` folder is too large for a single upload. Split it:

```bash
# ZIP 1 — everything except vendor/
zip -r project.zip . -x "vendor/*" -x ".git/*" -x "node_modules/*"

# ZIP 2 — vendor/ only
zip -r vendor.zip vendor/
```

**Step 4 — Upload via InfinityFree File Manager.**

1. Log in to InfinityFree → cPanel → File Manager.
2. Navigate to `htdocs/`.
3. Upload `project.zip`, extract it.
4. Upload `vendor.zip`, extract it into the same folder.

**Step 5 — Flatten the directory structure.**

Laravel's `public/` folder contents must move to `htdocs/` root. Everything else (app/, bootstrap/, config/, etc.) stays alongside.

The final structure:

```
htdocs/
├── index.php        ← moved from public/
├── .htaccess        ← moved from public/
├── app/
├── bootstrap/
├── config/
├── database/
├── resources/
├── routes/
├── storage/
├── vendor/
├── .env
└── ...
```

**Step 6 — Fix `index.php` paths.**

Laravel's default `public/index.php` references `../vendor` and `../bootstrap`. Since everything is flat inside `htdocs/`, remove the `../` [citation:13]:

```php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
```

**Step 7 — Configure `.htaccess`.**

The default Laravel `.htaccess` should work, but verify it points to `index.php` correctly.

**Step 8 — Run migrations manually.**

Since you can't run `php artisan migrate` on InfinityFree, you have two options:

1. **Pre-migrate locally**, then export the database schema and import it via phpMyAdmin.
2. **Create a temporary route** that runs migrations, visit it once, then delete the route. (Not recommended — risky if forgotten.)

**Option 1 is safer.** Export your local MySQL database (structure + any seed data), import it into InfinityFree's MySQL via phpMyAdmin.

### 3.2 When to Choose InfinityFree

- You cannot or will not pay $5/month for Railway Hobby.
- You accept that deployments take 30–60 minutes of manual work.
- You accept that the site may be slower and less reliable.
- You're comfortable with FileZilla and cPanel.

**If Railway's free tier works, stay on Railway.** InfinityFree is the emergency exit, not the preferred path.

---

## 4. Post-Deploy Verification

After deploying (on either host), verify:

### 4.1 Basic Checks

- [ ] The site loads at its public URL.
- [ ] Registration works. A verification email is sent (check Resend dashboard).
- [ ] Login works. Session persists across page reloads.
- [ ] Dark mode toggle works and persists.
- [ ] Create a deck. It appears in the deck list.
- [ ] Create a card manually. It appears in the card list.
- [ ] Generate cards with AI. The API responds with cards.
- [ ] Study a card. The answer reveals on click.
- [ ] Rate a card. The SM-2 state updates (check DB).

### 4.2 Security Checks

- [ ] `https://` is enforced (no mixed content warnings).
- [ ] Security headers are present. Check with `curl -I https://<domain>`.
- [ ] Another user's deck returns 404 (not 403) when accessed via URL.
- [ ] The study page's initial props do **not** contain answers.
- [ ] Rate limiting works: hit the AI endpoint 11 times, the 11th returns 429.

### 4.3 AI Checks

- [ ] Generation works with pasted text.
- [ ] Generation works with a PDF upload.
- [ ] Session analysis returns a coherent response.
- [ ] The daily limit is enforced (check `ai_usage_logs` rows).

### 4.4 The Portfolio Demo Check

**The most important test:** Open the deployed URL in an **incognito window**. Register a new account. Try to use the app as a recruiter would.

- Does it work without you having to do anything?
- Is the first impression clean?
- Are there any broken pages or console errors?

**If yes, deployment is done.**

---

## 5. Deployment Timeline (Day 8)

| Time           | Task                                                                  |
| -------------- | --------------------------------------------------------------------- |
| Morning        | Set up Railway project, MySQL, environment variables                  |
| Midday         | First deploy, fix build errors                                        |
| Afternoon      | Run migrations, verify basic flows                                    |
| Late afternoon | Post-deploy verification checklist                                    |
| Evening        | Incognito test, fix any final issues                                  |
| Night          | Commit the deployment config (`.env.example`, `railway.json` if used) |

**Buffer:** Day 9 is for final polish and documentation. If deployment takes longer than expected, Day 9 absorbs it.

---

## 6. What's NOT in This Doc

- **CI/CD pipelines.** Not needed for a 9-day project. Push to `main` = deploy.
- **Staging environments.** Only one environment (production). Local dev is the staging.
- **Custom domain setup.** Optional. Railway provides `*.up.railway.app`. Custom domains add DNS configuration that isn't worth the time.
- **Database backups.** Railway's managed MySQL has snapshots on paid plans. Free tier doesn't. Documented in `11-future-work.md`.
- **Monitoring/alerting.** Railway provides basic logs. No Sentry, no external monitoring. Documented in `11-future-work.md`.

---

## Relationship to Other Docs

- **Architecture** ([`02-architecture.md`](02-architecture.md)) — why the app is a single deployable unit
- **Security** ([`08-security.md`](08-security.md)) — the headers this doc configures
- **AI Integration** ([`05-ai-integration.md`](05-ai-integration.md)) — the Groq key configuration
- **Future Work** ([`11-future-work.md`](11-future-work.md)) — backups, monitoring, CI/CD
