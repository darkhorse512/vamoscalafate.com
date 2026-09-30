# Vamos Calafate

Tourism commerce and content platform for **El Calafate, Santa Cruz, Patagonia
Argentina** — excursions, transfers, a local directory, a travel guide, online
booking and online payment.

Two independently deployed Next.js applications sharing one PostgreSQL database
and a set of internal packages.

```
https://vamoscalafate.com        →  web    (public site)    :3000
https://admin.vamoscalafate.com  →  admin  (administration) :3001
```

---

## Contents

1. [Requirements](#1-requirements)
2. [Architecture](#2-architecture)
3. [Installation](#3-installation)
4. [Environment variables](#4-environment-variables)
5. [PostgreSQL setup](#5-postgresql-setup)
6. [Database migrations](#6-database-migrations)
7. [Seed data](#7-seed-data)
8. [Development](#8-development)
9. [Production build](#9-production-build)
10. [PM2](#10-pm2)
11. [Nginx](#11-nginx)
12. [SSL](#12-ssl)
13. [Resend email configuration](#13-resend-email-configuration)
14. [Payment configuration](#14-payment-configuration)
15. [Google Analytics](#15-google-analytics)
16. [Search Console](#16-search-console)
17. [Backups](#17-backups)
18. [Deployment](#18-deployment)
19. [Testing](#19-testing)
20. [Troubleshooting](#20-troubleshooting)
21. [What is NOT configured out of the box](#21-what-is-not-configured-out-of-the-box)

---

## 1. Requirements

| Component  | Version   | Notes                                       |
|------------|-----------|---------------------------------------------|
| Node.js    | ≥ 20.9    | Built and tested on 22 LTS                  |
| pnpm       | ≥ 9       | `corepack enable pnpm`                      |
| PostgreSQL | ≥ 14      | Built and tested on 18                      |
| Nginx      | ≥ 1.18    | Reverse proxy and TLS termination           |
| PM2        | latest    | Process supervision                         |

Framework versions are pinned in the manifests: Next.js 16, React 19, Prisma 7,
Tailwind CSS 4, TypeScript 5.9.

---

## 2. Architecture

```
vamoscalafate/
├── web/                  Public site — Next.js App Router, port 3000
├── admin/                Administration — Next.js App Router, port 3001
├── packages/
│   ├── db/               Prisma schema, client, cache tags   ← single source of truth
│   ├── types/            Shared domain types and service contracts
│   ├── validation/       Zod schemas — every server-side input contract
│   ├── email/            Transactional email (Resend SMTP) and templates
│   └── shared/           Env validation, RBAC, money, logging, site config
├── deploy/
│   ├── nginx/            Production Nginx site configuration
│   └── scripts/          deploy, backup, restore, health-check
├── tests/                unit · integration · e2e
├── ecosystem.config.cjs  PM2 process definitions
└── pnpm-workspace.yaml
```

### Why two applications

The admin is a **separate Next.js process on a separate hostname**, not a route
group inside the public site. That makes an accidental exposure of an admin
screen a deployment-level mistake rather than a routing mistake, allows the two
to be scaled and restarted independently, and lets the admin run a much
stricter security posture (no indexing, tighter CSP, no caching).

### Key design decisions

**Money is integer minor units.** Every price is an `Int` count of centavos.
Floating-point arithmetic never touches a booking total.

**Prices come from the database, never the request.** The client sends a
*selection*; `PricingService` prices it server-side. A tampered request cannot
change what is charged.

**Seats cannot be oversold.** Reservation is a single guarded `UPDATE` whose
`WHERE` clause carries the capacity check, so concurrent requests for the last
seats cannot both succeed. Covered by a concurrency test.

**A booking is only ever marked paid by a verified webhook.** The post-payment
redirect is presentation only. Webhook handling verifies the provider signature
over the raw body and is idempotent on `(provider, eventId)`.

**Content publishes without a rebuild.** Public reads are tagged; the admin
purges those tags over HTTP after a mutation. An editor publishes a tour and
the live site reflects it immediately — no build, no restart.

**Nothing is faked.** No stock photography presented as El Calafate, no seeded
reviews or ratings, no "connected" integration without credentials. Where an
integration needs external configuration, the app says so plainly — in the
dashboard, in the settings screen, and in `.env.example`.

---

## 3. Installation

```bash
git clone <repository-url> vamoscalafate
cd vamoscalafate

corepack enable pnpm
pnpm install

cp .env.example .env
# edit .env — see the next section
```

---

## 4. Environment variables

`.env.example` documents every variable, which are required, and which need
external configuration. Copy it to `.env` at the repository root for
development; in production use per-app files at `web/.env` and `admin/.env`.

Generate the secrets:

```bash
openssl rand -base64 48   # AUTH_SECRET
openssl rand -hex 32      # REVALIDATE_SECRET
```

Both applications must share the **same** `REVALIDATE_SECRET`, or the admin
cannot purge the public site's cache.

The application validates its environment at boot and refuses to start on a
missing or malformed required value, rather than failing later inside a
customer's checkout.

---

## 5. PostgreSQL setup

```bash
sudo -u postgres psql <<'SQL'
CREATE USER vamos WITH PASSWORD 'a-strong-password';
CREATE DATABASE vamoscalafate OWNER vamos;
GRANT ALL PRIVILEGES ON DATABASE vamoscalafate TO vamos;
SQL
```

Then set:

```
DATABASE_URL="postgresql://vamos:a-strong-password@localhost:5432/vamoscalafate?schema=public&connection_limit=10"
```

`connection_limit` is per Node process. Two processes at 10 each means 20
connections; keep PostgreSQL's `max_connections` comfortably above that.

---

## 6. Database migrations

```bash
pnpm db:migrate          # development — creates and applies a migration
pnpm db:migrate:deploy   # production  — applies committed migrations only
pnpm db:generate         # regenerate the Prisma client
pnpm db:studio           # browse the data
```

Never modify the production schema by hand. `migrate deploy` never generates or
resets, so it is safe to run automatically during a deploy.

---

## 7. Seed data

```bash
pnpm db:seed
```

Creates the RBAC tables, a `SUPER_ADMIN` account, taxonomy, **15 demo tourism
products**, seven travel-guide articles, global FAQs, legal page scaffolding and
a small demo directory.

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running, or no admin
account is created. **Change the password after the first login.**

The seed is idempotent — every write is an upsert keyed on a natural unique
column, so it is safe to re-run.

### About the demo content

Every seeded row is marked `isDemo: true` and shows a **DEMO** badge in the
admin. The excursion *types* are real categories of activity offered in El
Calafate, and the geographic facts are publicly verifiable. Everything
commercially specific — **prices, departure times, capacities, inclusions** — is
placeholder data. Replace it before selling.

**Deliberately not seeded:** reviews, ratings, awards, certifications,
testimonials, bookings, customers and payments. Fabricated social proof would
mislead travellers and create legal exposure; fabricated bookings would corrupt
the reporting the dashboard exists to provide.

---

## 8. Development

```bash
pnpm dev          # both apps
pnpm dev:web      # public site  → http://localhost:3000
pnpm dev:admin    # admin        → http://localhost:3001
```

---

## 9. Production build

```bash
pnpm lint         # must pass with zero warnings
pnpm typecheck    # must pass
pnpm build        # builds both apps
pnpm start        # runs both standalone servers
```

Both apps use `output: 'standalone'`. `next start` does **not** work with that
setting — the build emits a self-contained server, and `pnpm start` runs it.
A post-build step copies `.next/static` and `public/` next to that server,
since Next deliberately leaves them out of the bundle.

---

## 10. PM2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup          # prints the command to run once, for boot persistence

pm2 status
pm2 logs vamoscalafate-web --lines 100
pm2 reload vamoscalafate-web      # zero-downtime
pm2 restart vamoscalafate-admin
```

Both processes bind to `127.0.0.1` only, so ports 3000 and 3001 are never
reachable from the Internet.

---

## 11. Nginx

```bash
sudo cp deploy/nginx/vamoscalafate.conf /etc/nginx/sites-available/vamoscalafate
sudo ln -s /etc/nginx/sites-available/vamoscalafate /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Handles TLS, HTTP→HTTPS, www→apex, compression, rate limiting, upload limits,
and serves uploaded media straight from disk without touching Node.

---

## 12. SSL

```bash
sudo certbot --nginx \
  -d vamoscalafate.com \
  -d www.vamoscalafate.com \
  -d admin.vamoscalafate.com

sudo systemctl status certbot.timer   # renewal is automatic
```

---

## 13. Resend email configuration

**REQUIRED EXTERNAL CONFIGURATION.** Until this is done, `EMAIL_TRANSPORT`
stays `console`: messages are logged and **nothing is delivered**. Delivery is
never faked or reported as successful.

1. Create an API key at <https://resend.com/api-keys> → `RESEND_SMTP_PASSWORD`
2. Add and verify `vamoscalafate.com` at <https://resend.com/domains>
3. Publish the DNS records Resend generates (the values are account-specific):

   | Type | Host                     | Purpose |
   |------|--------------------------|---------|
   | TXT  | `send.vamoscalafate.com` | SPF     |
   | TXT  | `resend._domainkey`      | DKIM    |
   | MX   | `send.vamoscalafate.com` | bounce handling |
   | TXT  | `_dmarc`                 | DMARC   |

4. Set `EMAIL_TRANSPORT=smtp` and restart.

Use a verified sender such as `reservas@vamoscalafate.com`. **Do not** use
`onboarding@resend.dev` in production.

Verify from the admin: **Ajustes → Estado de las integraciones**.

---

## 14. Payment configuration

**REQUIRED EXTERNAL CONFIGURATION.** Providers without complete credentials are
hidden at checkout, so a customer is never sent into a payment flow that cannot
complete.

### Mercado Pago

1. Production credentials from the [developer panel](https://www.mercadopago.com.ar/developers/panel)
   → `MERCADOPAGO_ACCESS_TOKEN`
2. Create a webhook:
   - URL: `https://vamoscalafate.com/api/webhooks/mercadopago`
   - Topic: `payment`
3. Copy the signing secret → `MERCADOPAGO_WEBHOOK_SECRET`

### Stripe

1. Secret key from the [dashboard](https://dashboard.stripe.com/apikeys)
   → `STRIPE_SECRET_KEY`
2. Create an endpoint at `https://vamoscalafate.com/api/webhooks/stripe` for:
   `checkout.session.completed`, `checkout.session.expired`,
   `charge.refunded`, `payment_intent.payment_failed`
3. Copy the signing secret (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`

Both webhook handlers verify the provider's signature over the raw request
body, reject stale timestamps, and are idempotent. A booking is **never**
marked paid from a client-side redirect.

---

## 15. Google Analytics

Set `NEXT_PUBLIC_GA_ID` to a GA4 Measurement ID (`G-XXXXXXXXXX`).

The tag is **only loaded after the visitor grants consent** — a visitor who
declines never downloads it. Events are defined in one place
(`web/src/lib/analytics.ts`): `page_view`, `view_item`, `search`,
`select_item`, `booking_started`, `begin_checkout`, `add_payment_info`,
`purchase`, `generate_lead`, `hotel_submission`, `contact`, `click_whatsapp`,
`click_phone`, `click_email`.

`purchase` fires exactly once per booking reference, guarded against refreshes
and back-navigation so revenue is never double-counted.

---

## 16. Search Console

1. Add `https://vamoscalafate.com` as a property
2. Choose HTML-tag verification and set `NEXT_PUBLIC_GSC_VERIFICATION`
3. Rebuild, deploy, verify
4. Submit `https://vamoscalafate.com/sitemap.xml`

The sitemap is generated from the database, so publishing content adds it
automatically. Drafts, archived content, the checkout funnel, search results
and the admin are all excluded.

The admin domain returns `Disallow: /` and `X-Robots-Tag: noindex` on every
response, and appears in no sitemap.

---

## 17. Backups

```bash
sudo mkdir -p /var/backups/vamoscalafate && sudo chmod 700 /var/backups/vamoscalafate
sudo crontab -e
```

```cron
0 3 * * * /var/www/vamoscalafate/deploy/scripts/backup-database.sh
```

Produces a verified, compressed, selectively restorable dump; keeps 14 days.

Restore:

```bash
./deploy/scripts/restore-database.sh /var/backups/vamoscalafate/vamoscalafate-<timestamp>.dump
```

The restore script takes a safety dump of the current state first, stops the
apps, restores, re-applies migrations and restarts.

> **The backup script writes to local disk only.** Local-only backups do not
> survive the loss of the server. Add an offsite copy — the script marks the
> exact place — and rehearse a restore on staging. An untested restore
> procedure is not a backup strategy.

Also back up `STORAGE_LOCAL_DIR` (uploaded media). It is not in the database
and not in the repository.

---

## 18. Deployment

```bash
cd /var/www/vamoscalafate
./deploy/scripts/deploy.sh
```

Pulls, installs with a frozen lockfile, generates the client, applies
migrations, builds, then reloads PM2 with zero downtime and runs a health
check. Any failure before the reload leaves the previous version serving.

Full first-time server setup: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Monitoring:

```bash
./deploy/scripts/health-check.sh          # processes, HTTP, DB, disk, backups, TLS
./deploy/scripts/health-check.sh --quiet  # exit code only, for cron
```

---

## 19. Testing

```bash
pnpm test        # unit + integration (vitest)
pnpm test:e2e    # end-to-end (playwright, both apps)
```

| Layer       | Covers |
|-------------|--------|
| Unit        | money arithmetic, booking state machine, every validation schema, Markdown XSS safety, **webhook signature verification** (forgery, tampering, replay) |
| Integration | real PostgreSQL — pricing, **oversell under concurrency**, seat release on cancellation, webhook idempotency, amount verification, password and session storage, the RBAC matrix |
| End-to-end  | real production builds of both apps — homepage, catalogue, filters, tour page, booking selection, reservation, admin login, session cookie flags, tour editor, submissions, audit trail, SEO artefacts, security headers, and a mobile-viewport booking pass |

Integration tests run against a real database rather than a mock, because the
behaviour that matters — transactional seat reservation, unique-constraint
idempotency — lives in the database, not in application code.

---

## 20. Troubleshooting

**`next start` warns about `output: standalone`**
Expected. Use `pnpm start`, which runs the generated standalone server.

**Assets 404 after a build**
The post-build step did not run. `pnpm build`, or
`node scripts/prepare-standalone.mjs <web|admin>` from the app directory.

**Admin edits do not appear on the public site**
Check that `REVALIDATE_SECRET` is identical in both apps and that the admin can
reach `NEXT_PUBLIC_SITE_URL`. The admin logs a warning when a purge fails.

**Emails are not arriving**
Check **Ajustes → Estado de las integraciones**. With `EMAIL_TRANSPORT=console`
nothing is sent by design. With `smtp`, confirm the domain is verified in
Resend and the DNS records are published.

**A webhook returns 400**
Signature verification failed — usually a mismatched secret, or a proxy that
altered the request body. The raw body must reach the handler byte-for-byte;
the supplied Nginx config sets `proxy_request_buffering off` for that reason.

**`Too many connections`**
Lower `connection_limit` in `DATABASE_URL` or raise PostgreSQL's
`max_connections`. Each Node process keeps its own pool.

**Seat counts look wrong**
Inspect `tour_availability`. `seatsBooked` is only changed inside a booking
transaction; cancelling and refunding release seats automatically.

---

## 21. What is NOT configured out of the box

Stated plainly, because a platform that pretends to be finished is worse than
one that tells you what is left:

| Item | Status |
|------|--------|
| Payment providers | Architecture complete, **credentials required** |
| Transactional email | Architecture complete, **Resend key + DNS required** |
| Photography | **None shipped.** Designed placeholders render until real images are uploaded — no stock imagery is presented as El Calafate |
| Legal pages | **Structural templates only.** Every operator-specific field is marked `«…»`. Have a lawyer review them |
| Offsite backups | **Not configured.** Local dumps only |
| S3 media storage | Interface defined; **only the local driver is implemented** — selecting `s3` raises a clear error rather than silently writing to disk |
| Reviews | Moderation workflow complete; **no reviews exist** and none are fabricated |
| GA4 / Search Console | Wiring complete, **IDs required** |
| Real commercial data | 15 demo products marked `isDemo` — **prices and schedules are placeholders** |

Everything above is architecture-complete: supplying the credential or the
content is all that is needed. Nothing is stubbed with fake success.

---

## Licence

Proprietary. © Vamos Calafate.
