# DNS reference — vamoscalafate.com

Captured from live DNS on 2026-09-30, **before** the web migration to the new
VPS. Keep this: the Cloudflare UI truncates long TXT values, and the DKIM
public key cannot be reconstructed if lost — only re-issued by the mail host.

---

## Current email authentication records

These three belong to **Hostmar**, which hosts the mailboxes. The website
migration does not touch them. Do not delete them.

### SPF — `vamoscalafate.com` TXT

```
v=spf1 include:comp.hostmar.com include:envialotrs.hostmar.com -all
```

| Part | Meaning |
|---|---|
| `include:comp.hostmar.com` | Hostmar's general mail servers may send as this domain |
| `include:envialotrs.hostmar.com` | Hostmar's bulk/transactional sender may too |
| `-all` | **Hard fail.** Anything else claiming to be this domain should be rejected |

> A domain may have **exactly one** SPF record. Two `v=spf1` TXT records is a
> permanent error and breaks authentication for all mail.

### DKIM — `mail._domainkey.vamoscalafate.com` TXT

```
v=DKIM1;g=*;k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDKyWgdOhqXY2iOPXaBIpuFB4VJjef4PcjsnynS2f47xy6h8o+wh5H7KsF2lD645fWmtI8zxNiy3fK05qwO+CaYdIGVjMipywrykrU5uwy4gioe6SsHjOmOp2VJ6U/YTKqCJIYKKwMwC8glD+3Hrh0MaG4SOu8Ax0SuB0kHaBYuSQIDAQAB
```

`mail` is the *selector*. The matching **private** key lives on Hostmar's
servers and is not recoverable from here — if this record is lost, Hostmar
must supply the value again or issue a new key pair.

### DMARC — `_dmarc.vamoscalafate.com` TXT

```
v=DMARC1; p=none; rua=mailto:ventas@vamoscalafate.com ; ruf=mailto:ventas@vamoscalafate.com
```

| Part | Meaning |
|---|---|
| `p=none` | **Monitor only** — receivers report failures but deliver anyway |
| `rua=` | Daily aggregate reports (XML) go to ventas@ |
| `ruf=` | Individual failure reports go to ventas@ |

---

## Target state after the web migration

| Name | Type | Value | Proxy |
|---|---|---|---|
| `vamoscalafate.com` | A | `2.25.211.75` | Proxied |
| `admin` | A | `2.25.211.75` | Proxied |
| `www` | CNAME | `vamoscalafate.com` | Proxied |
| `mail` | A | `200.58.112.49` | **DNS only** |
| `mail` | AAAA | `2800:6c0:2::183` | **DNS only** |
| `mx1` | A | `200.58.122.206` | **DNS only** |
| `ftp` | A | `200.58.112.49` | **DNS only** |
| `ftp` | AAAA | `2800:6c0:2::183` | **DNS only** |
| `autoconfig` | CNAME | `mail.vamoscalafate.com` | **DNS only** |
| `autodiscover` | CNAME | `mail.vamoscalafate.com` | **DNS only** |
| `vamoscalafate.com` | MX 0 | `mail.vamoscalafate.com` | — |
| `vamoscalafate.com` | MX 20 | `mx1.vamoscalafate.com` | — |
| SPF / DKIM / DMARC | TXT | unchanged, as above | — |

**Anything used for mail must be DNS only.** Cloudflare's proxy handles HTTP
and HTTPS only; a proxied `mail` or `mx` hostname resolves to Cloudflare's web
addresses, which do not accept SMTP, and delivery fails.

---

## Adding Resend without touching the existing SPF

Resend offers two verification paths. **Use the subdomain path** — it leaves
the Hostmar SPF completely alone, which matters here because `-all` is a hard
fail and a mistake would bounce real mail.

Add these, replacing the placeholder values with the ones Resend generates:

| Name | Type | Value |
|---|---|---|
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |
| `send` | MX | `feedback-smtp.<region>.amazonses.com` (priority 10) |
| `resend._domainkey` | TXT | *(DKIM key from the Resend dashboard)* |

Why this is safe:

- The new SPF sits on `send.vamoscalafate.com`, a different name. The root SPF
  is untouched and Hostmar mail keeps working exactly as it does now.
- The DKIM selector is `resend`, distinct from Hostmar's `mail` selector. Both
  coexist.
- DMARC uses relaxed alignment by default, so `send.vamoscalafate.com` still
  aligns with a `From:` of `reservas@vamoscalafate.com`.

**Do not** add `include:amazonses.com` to the root SPF unless Resend
explicitly asks you to verify the root domain. Never create a second
`v=spf1` record.

---

## Tightening DMARC later

`p=none` protects nothing — it only reports. Once Resend is live and the
aggregate reports at ventas@ show both Hostmar and Resend mail passing,
tighten in stages over a few weeks:

```
p=none  →  p=quarantine; pct=25  →  p=quarantine  →  p=reject
```

Do not jump straight to `p=reject`: any sender you forgot to authorise will
have its mail silently discarded.

---

## Re-reading these values

```bash
dig +short TXT vamoscalafate.com @1.1.1.1
dig +short TXT mail._domainkey.vamoscalafate.com @1.1.1.1
dig +short TXT _dmarc.vamoscalafate.com @1.1.1.1
```

Cloudflare's **Export** button also produces a complete BIND zone file — take
one before any bulk change.
