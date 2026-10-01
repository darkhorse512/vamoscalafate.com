# Deployment - Ubuntu VPS

Exact, ordered steps to take a fresh Ubuntu server to a running
**vamoscalafate.com** and **admin.vamoscalafate.com**.

Tested against Ubuntu 22.04 and 24.04 LTS. Commands assume a `sudo`-capable
user. Anything you must substitute is written `LIKE_THIS`.

---

## 0. Before you start

You need:

- A VPS with **≥ 2 GB RAM** (Next.js builds are memory-hungry; 1 GB will OOM
  during the build) and ≥ 20 GB disk
- DNS control for `vamoscalafate.com`
- The repository URL and deploy access

Point DNS at the server **before** requesting certificates - Certbot validates
over HTTP and will fail otherwise:

| Type | Host    | Value              |
|------|---------|--------------------|
| A    | `@`     | `YOUR_SERVER_IP`   |
| A    | `www`   | `YOUR_SERVER_IP`   |
| A    | `admin` | `YOUR_SERVER_IP`   |

Confirm propagation:

```bash
dig +short vamoscalafate.com
dig +short admin.vamoscalafate.com
```

---

## 1. Base system

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban unattended-upgrades

sudo timedatectl set-timezone America/Argentina/Rio_Gallegos
```

Unattended security upgrades:

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 2. Firewall

Only SSH and HTTP(S) are exposed. **Ports 3000 and 3001 are never opened** -
the Node processes bind to `127.0.0.1` and are reachable only through Nginx.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status verbose
```

`fail2ban` protects SSH out of the box:

```bash
sudo systemctl enable --now fail2ban
```

---

## 3. Deploy user

Running the application as root means a code-execution bug becomes a full
server compromise.

```bash
sudo adduser --disabled-password --gecos "" vamos
sudo usermod -aG sudo vamos

sudo mkdir -p /home/vamos/.ssh
sudo cp ~/.ssh/authorized_keys /home/vamos/.ssh/
sudo chown -R vamos:vamos /home/vamos/.ssh
sudo chmod 700 /home/vamos/.ssh && sudo chmod 600 /home/vamos/.ssh/authorized_keys
```

Harden SSH - in `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
sudo systemctl restart ssh
```

**Open a second SSH session as `vamos` and confirm it works before closing the
first one.** Locking yourself out of a fresh VPS is easy and tedious to undo.

---

## 4. Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo corepack enable pnpm

node -v   # v22.x
pnpm -v   # 9.x
```

---

## 5. PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

sudo -u postgres psql <<'SQL'
CREATE USER vamos WITH PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';
CREATE DATABASE vamoscalafate OWNER vamos;
GRANT ALL PRIVILEGES ON DATABASE vamoscalafate TO vamos;
SQL
```

Verify:

```bash
psql "postgresql://vamos:REPLACE_WITH_A_STRONG_PASSWORD@localhost:5432/vamoscalafate" -c '\conninfo'
```

PostgreSQL listens on localhost only by default - leave it that way.

---

## 6. Nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
sudo mkdir -p /var/www/certbot
```

---

## 7. PM2

```bash
sudo npm install -g pm2
sudo mkdir -p /var/log/vamoscalafate
sudo chown vamos:vamos /var/log/vamoscalafate
```

---

## 8. Application directory

```bash
sudo mkdir -p /var/www/vamoscalafate
sudo chown vamos:vamos /var/www/vamoscalafate

sudo mkdir -p /var/www/vamoscalafate/storage/media
sudo chown -R vamos:vamos /var/www/vamoscalafate/storage
sudo chmod 755 /var/www/vamoscalafate/storage/media
```

---

## 9. Clone and configure

**As the `vamos` user from here on.**

```bash
su - vamos
cd /var/www
git clone YOUR_REPOSITORY_URL vamoscalafate
cd vamoscalafate

pnpm install --frozen-lockfile
```

Generate the secrets:

```bash
openssl rand -base64 48   # AUTH_SECRET
openssl rand -hex 32      # REVALIDATE_SECRET
```

### `web/.env`

```bash
cp .env.example web/.env
nano web/.env
```

```ini
DATABASE_URL="postgresql://vamos:YOUR_DB_PASSWORD@localhost:5432/vamoscalafate?schema=public&connection_limit=10"
NODE_ENV="production"

NEXT_PUBLIC_SITE_URL="https://vamoscalafate.com"
NEXT_PUBLIC_ADMIN_URL="https://admin.vamoscalafate.com"

AUTH_SECRET="PASTE_THE_GENERATED_SECRET"
REVALIDATE_SECRET="PASTE_THE_GENERATED_HEX"

EMAIL_TRANSPORT="console"          # switch to "smtp" once Resend is verified
RESEND_SMTP_PASSWORD=""
EMAIL_FROM="Vamos Calafate <reservas@vamoscalafate.com>"
EMAIL_ADMIN="reservas@vamoscalafate.com"

MERCADOPAGO_ACCESS_TOKEN=""
MERCADOPAGO_WEBHOOK_SECRET=""
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

STORAGE_DRIVER="local"
STORAGE_LOCAL_DIR="/var/www/vamoscalafate/storage/media"
STORAGE_PUBLIC_URL="https://vamoscalafate.com/media"

NEXT_PUBLIC_GA_ID=""
NEXT_PUBLIC_GSC_VERIFICATION=""
NEXT_PUBLIC_WHATSAPP_NUMBER=""
NEXT_PUBLIC_CONTACT_EMAIL="ventas@vamoscalafate.com"
```

### `admin/.env`

```bash
cp web/.env admin/.env
```

The admin needs the same values. **`AUTH_SECRET` and `REVALIDATE_SECRET` must
be identical in both files** - the shared revalidation secret is what lets the
admin purge the public site's cache.

```bash
chmod 600 web/.env admin/.env
```

Secrets live only in these files. They are git-ignored and must never be
committed.

---

## 10. Database

```bash
cd /var/www/vamoscalafate

pnpm db:generate
pnpm db:migrate:deploy
```

Seed. Set the first administrator's credentials first:

```bash
SEED_ADMIN_EMAIL="you@vamoscalafate.com" \
SEED_ADMIN_PASSWORD="A-Strong-Initial-Password-1" \
pnpm db:seed
```

Change that password after the first login.

---

## 11. Build

```bash
pnpm lint
pnpm typecheck
pnpm build
```

All three must pass. On a 2 GB server, if the build is killed:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 12. Start under PM2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd -u vamos --hp /home/vamos
# run the command it prints, with sudo
```

Verify locally before exposing anything:

```bash
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3001/login
pm2 status
```

Both must return `200`.

---

## 13. Nginx

```bash
# The snippets are REQUIRED — the site config includes them and will not load
# without them.
sudo mkdir -p /etc/nginx/snippets
sudo cp /var/www/vamoscalafate/deploy/nginx/snippets/*.conf /etc/nginx/snippets/

sudo cp /var/www/vamoscalafate/deploy/nginx/vamoscalafate.conf \
        /etc/nginx/sites-available/vamoscalafate
sudo ln -s /etc/nginx/sites-available/vamoscalafate /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

The config references certificates that do not exist yet, so comment out the
three `ssl_*` lines and the `include`/`ssl_dhparam` lines in each HTTPS block
for now, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 13b. Cloudflare

This domain sits behind Cloudflare, which changes three things. Get these
wrong and the site either loops infinitely or silently loses every visitor's
IP address.

### SSL/TLS mode — set this FIRST

**SSL/TLS → Overview → Full (strict).**

Any other mode breaks the site:

| Mode | Result |
|---|---|
| **Off** | No HTTPS at all |
| **Flexible** | Cloudflare talks to the origin over HTTP while serving HTTPS. Nginx redirects HTTP→HTTPS, Cloudflare follows it back to itself → **infinite redirect loop (ERR_TOO_MANY_REDIRECTS)** |
| **Full** | Encrypted to the origin but the certificate is not validated |
| **Full (strict)** | ✅ Encrypted and validated against the Let's Encrypt certificate |

If the site loops after going live, this setting is almost always why.

### Issuing the certificate

Certbot's HTTP-01 challenge must reach the origin. Either:

- **Grey-cloud the records while issuing** (simplest): set `vamoscalafate.com`,
  `www` and `admin` to *DNS only*, run Certbot, then re-enable the orange
  cloud; or
- Leave the proxy on and make sure **SSL/TLS → Edge Certificates → Always Use
  HTTPS is OFF** during issuance, so the challenge over port 80 is not
  redirected.

The supplied Nginx config already serves `/.well-known/acme-challenge/` over
plain HTTP for renewals.

### Real visitor IP addresses — required

With the orange cloud on, every request reaches the origin from a Cloudflare
address. Without restoration, nginx logs Cloudflare rather than visitors and
**the application rate-limits all traffic into a single bucket**.

The Nginx config includes `snippets/cloudflare-real-ip.conf`, which trusts
`CF-Connecting-IP` from Cloudflare's published ranges and from nowhere else.
Install the snippets alongside the site config:

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp /var/www/vamoscalafate/deploy/nginx/snippets/*.conf /etc/nginx/snippets/
```

Keep the ranges current — Cloudflare adds networks occasionally:

```bash
sudo /var/www/vamoscalafate/deploy/scripts/update-cloudflare-ips.sh

# monthly, via root's crontab
0 4 1 * * /var/www/vamoscalafate/deploy/scripts/update-cloudflare-ips.sh --quiet
```

Verify after going live — this must show a real visitor address, not
`172.x` or `104.x`:

```bash
sudo tail -20 /var/log/nginx/vamoscalafate.access.log
```

### Lock the origin to Cloudflare

Once the orange cloud is on, nothing should reach the origin directly.
Restricting ports 80 and 443 to Cloudflare's ranges stops an attacker who
discovers the origin IP from bypassing Cloudflare entirely — and from forging
`CF-Connecting-IP` to evade rate limits.

```bash
sudo ufw delete allow 'Nginx Full'

for ip in $(curl -s https://www.cloudflare.com/ips-v4)           $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow from "$ip" to any port 80,443 proto tcp comment 'cloudflare'
done

sudo ufw status numbered
```

Re-run this after `update-cloudflare-ips.sh` reports new ranges.

> Do this only **after** certificates are issued and the site is confirmed
> working through Cloudflare. Applying it too early blocks Certbot's challenge.

### Caching

Leave Cloudflare's default cache rules alone. The application already sets
correct `Cache-Control` headers, and Next.js serves content-hashed assets that
are safe to cache forever.

Do **not** enable "Cache Everything" without an exclusion for `/api/*`,
`/reservar`, `/checkout` and the admin hostname — caching a checkout page
would serve one customer's booking to another.

If content looks stale after publishing, purge with
**Caching → Configuration → Purge Everything**, then confirm the origin is
correct with:

```bash
curl -H "Host: vamoscalafate.com" http://127.0.0.1:3000/excursiones/SLUG | grep '<h1'
```

If the origin is right and Cloudflare is wrong, it is a Cloudflare cache
issue, not an application one.

### Mail must bypass the proxy

Cloudflare's proxy handles HTTP and HTTPS only. **Any hostname used for mail
must be grey-clouded (DNS only)** — a proxied `mail` or `mx` record resolves
to Cloudflare's web addresses, which do not accept SMTP, and delivery fails.


---

## 14. TLS

```bash
sudo certbot --nginx \
  -d vamoscalafate.com \
  -d www.vamoscalafate.com \
  -d admin.vamoscalafate.com \
  --agree-tos -m you@vamoscalafate.com --no-eff-email
```

Certbot writes the certificate paths in. Restore the `ssl_*` lines from the
supplied config if you commented them out, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Renewal is automatic:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 15. Verify

```bash
curl -I https://vamoscalafate.com
curl -I https://www.vamoscalafate.com          # expect 301 → apex
curl -I https://admin.vamoscalafate.com/login

curl -s https://vamoscalafate.com/robots.txt
curl -s https://vamoscalafate.com/sitemap.xml | head -20
curl -s https://admin.vamoscalafate.com/robots.txt   # expect Disallow: /

# Ports must NOT be reachable from outside
curl --max-time 5 http://YOUR_SERVER_IP:3000    # expect connection refused
```

Then in a browser:

1. Load the homepage - hero, featured excursions, real prices
2. Open an excursion - gallery, itinerary, booking widget
3. Pick a date and a departure - a total appears
4. Sign in at `admin.vamoscalafate.com`
5. Edit a tour, publish, and confirm the public page updates **without a
   rebuild**

---

## 16. Backups

```bash
sudo mkdir -p /var/backups/vamoscalafate
sudo chown vamos:vamos /var/backups/vamoscalafate
sudo chmod 700 /var/backups/vamoscalafate

crontab -e
```

```cron
0 3 * * * /var/www/vamoscalafate/deploy/scripts/backup-database.sh
*/15 * * * * /var/www/vamoscalafate/deploy/scripts/health-check.sh --quiet
```

Run one immediately and confirm it verifies:

```bash
./deploy/scripts/backup-database.sh
ls -lh /var/backups/vamoscalafate/
```

> **Add an offsite copy.** The script marks the exact place. A backup that
> lives only on the machine it is protecting is not a backup.
>
> Also back up `/var/www/vamoscalafate/storage/media` - uploaded images are not
> in the database.

**Rehearse a restore on a staging database before you need it.**

---

## 17. External integrations

These cannot be completed from the server; each needs a third-party dashboard.
Until they are done the application says so plainly rather than pretending.

### Email (Resend)

1. API key → `RESEND_SMTP_PASSWORD` in both `.env` files
2. Verify `vamoscalafate.com` at <https://resend.com/domains>
3. Publish the SPF, DKIM, DMARC and MX records Resend generates
4. Set `EMAIL_TRANSPORT="smtp"`
5. `pm2 reload all`

### Payments

Mercado Pago and Stripe: see [README §14](./README.md#14-payment-configuration)
for keys and the exact webhook URLs and events.

After configuring, send a test event from the provider dashboard and confirm a
`200`:

```bash
pm2 logs vamoscalafate-web --lines 50 | grep webhook
```

### Analytics

Set `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_GSC_VERIFICATION`, then **rebuild** -
`NEXT_PUBLIC_*` values are inlined at build time, so a reload alone is not
enough:

```bash
pnpm build && pm2 reload all
```

Confirm everything in the admin: **Ajustes → Estado de las integraciones**.

---

## 18. Routine operations

### Deploy an update

```bash
cd /var/www/vamoscalafate
./deploy/scripts/deploy.sh
```

### Roll back

```bash
git log --oneline -10
git reset --hard COMMIT_SHA
pnpm install --frozen-lockfile && pnpm build
pm2 reload ecosystem.config.cjs --env production
```

A rollback does **not** undo database migrations. If the bad deploy included
one, restore from the pre-deploy backup instead.

### Logs

```bash
pm2 logs --lines 100
pm2 logs vamoscalafate-web --err

sudo tail -f /var/log/nginx/vamoscalafate.error.log
```

Application logs are structured JSON, one object per line, ready to ship to
any aggregator.

### Health

```bash
./deploy/scripts/health-check.sh
```

Checks processes, HTTP, the database, disk, backup freshness and TLS expiry.

---

## 19. Post-launch checklist

**Content**
- [ ] Replace the 15 demo products with real commercial data
- [ ] Upload real photography (until then, designed placeholders render - no
      stock imagery is passed off as El Calafate)
- [ ] Have a lawyer review the legal pages; replace every `«…»` placeholder
- [ ] Set the WhatsApp number and contact details
- [ ] Remove the demo hotel and business listings

**Operations**
- [ ] Change the seeded admin password
- [ ] Create individual accounts per team member with least-privilege roles
- [ ] Confirm a real email is delivered end to end
- [ ] Take a test booking through a real payment and confirm the webhook
- [ ] Configure and verify an offsite backup
- [ ] Rehearse a restore

**Search**
- [ ] Verify the property in Search Console and submit the sitemap
- [ ] Confirm the admin domain is not indexed
- [ ] Validate structured data with Google's Rich Results Test

---

## 20. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `502 Bad Gateway` | Node is not running. `pm2 status`, `pm2 logs` |
| Build killed | Out of memory - add swap (§11) |
| `next start` warning | Expected with standalone output; use `pnpm start` |
| Assets 404 | Post-build copy did not run; re-run `pnpm build` |
| Admin edits not live | `REVALIDATE_SECRET` mismatch between the two `.env` files |
| Webhook 400 | Signature mismatch, or a proxy altered the body. The supplied Nginx config disables request buffering for `/api/webhooks/` |
| No email | `EMAIL_TRANSPORT=console` sends nothing by design. Check the admin settings screen |
| `Too many connections` | Lower `connection_limit`, or raise PostgreSQL `max_connections` |
| Certbot fails | DNS not propagated, or port 80 blocked |

---

## Architecture summary

```
                    Internet
                       │
                     HTTPS
                       │
                  ┌────▼────┐
                  │  Nginx  │  TLS · www→apex · gzip · rate limit · /media
                  └────┬────┘
            ┌──────────┴──────────┐
            │                     │
  vamoscalafate.com      admin.vamoscalafate.com
            │                     │
  ┌─────────▼─────────┐ ┌─────────▼─────────┐
  │  Next.js  :3000   │ │  Next.js  :3001   │   PM2, bound to 127.0.0.1
  │  public site      │ │  administration   │
  └─────────┬─────────┘ └─────────┬─────────┘
            │                     │
            └──────────┬──────────┘
                       │
                ┌──────▼──────┐
                │ PostgreSQL  │  localhost only
                └─────────────┘
```

The admin purges the public site's cache over HTTP after a mutation, which is
why content publishes without a rebuild or a restart.
