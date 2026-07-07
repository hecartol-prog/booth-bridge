# RC5-2 — Production Domain Configuration

**Generated:** 2026-07-06  
**Target domains:** `boothbridge.app`, `www.boothbridge.app`  
**Registrar / DNS host:** Hostinger  
**Application host (target):** Vercel  
**Validator:** RC5 release engineering session (evidence-only)

---

## Executive Summary

| Check | Result |
|-------|--------|
| Root domain HTTPS | **PASS** (TLS works; wrong content) |
| `www` redirect | **PASS** (`www` → root) |
| DNS pointed to Vercel | **FAIL** |
| Canonical domain choice | **Recommend `boothbridge.app` (apex)** — `www` already redirects to apex |
| Application served | **FAIL** — Hostinger placeholder, not BoothBridge |

---

## Live DNS Records (observed 2026-07-06)

### `boothbridge.app` (apex)

```text
nslookup boothbridge.app

Name:    boothbridge.app
Addresses:
  2a02:4780:2b:1558:0:34f5:11ac:a   (IPv6)
  82.197.83.245                       (IPv4)
```

| Record type | Value | Interpretation |
|-------------|-------|----------------|
| **A** (inferred) | `82.197.83.245` | Hostinger shared hosting IP — **not** Vercel (`76.76.21.x` / `cname.vercel-dns.com`) |
| **AAAA** (inferred) | `2a02:4780:2b:1558:0:34f5:11ac:a` | Hostinger IPv6 |

### `www.boothbridge.app`

```text
nslookup www.boothbridge.app

Name:    gcp-us-west1-1.origin.onrender.com.cdn.cloudflare.net
Addresses: 216.24.57.8, 216.24.57.9
Aliases:  www.boothbridge.app
          base44.onrender.com
          gcp-us-west1-1.origin.onrender.com
```

| Record type | Value | Interpretation |
|-------------|-------|----------------|
| **CNAME** (inferred) | `base44.onrender.com` → Cloudflare CDN | **Legacy Base44/Render deployment chain** — stale |
| Resolves via | Cloudflare (`CF-RAY` in HTTP response) | Proxy layer in front of Render origin |

---

## HTTPS & Redirect Behavior

### Apex — `https://boothbridge.app`

```text
HTTP/1.1 200 OK
Server: LiteSpeed
platform: hostinger
X-Powered-By: PHP/8.3.30
Content-Type: text/html; charset=UTF-8
```

- TLS: **works** (HTTPS connection established)
- Content: Hostinger **"Default page"** — not BoothBridge application
- SSL issuer: **NOT VERIFIED** (certificate details not captured; connection succeeded)

### WWW — `https://www.boothbridge.app`

```text
HTTP/1.1 301 Moved Permanently
location: https://boothbridge.app/
Server: cloudflare
```

| Behavior | Status |
|----------|--------|
| HTTPS on `www` | **PASS** |
| Redirect to apex | **PASS** (`www` → `https://boothbridge.app/`) |
| Canonical domain | **`boothbridge.app` (apex)** — already enforced by redirect |

---

## Target DNS Configuration (Vercel)

Once Vercel project is created and custom domain added in Vercel Dashboard:

### Recommended canonical: `boothbridge.app`

| Host | Type | Value | Purpose |
|------|------|-------|---------|
| `@` (apex) | **A** | `76.76.21.21` | Vercel apex (verify current IP in Vercel Dashboard) |
| `www` | **CNAME** | `cname.vercel-dns.com` | Vercel www alias |

> **Note:** Vercel may provide project-specific values. Always copy exact records from Vercel Dashboard → Domains → `boothbridge.app`.

### Records to remove / replace

| Current | Action |
|---------|--------|
| A `82.197.83.245` (Hostinger) | **Replace** with Vercel A record |
| AAAA Hostinger IPv6 | **Remove or replace** per Vercel guidance |
| CNAME `www` → `base44.onrender.com` | **Replace** with `cname.vercel-dns.com` |

---

## SSL Status

| Domain | TLS handshake | Certificate | App content |
|--------|---------------|-------------|-------------|
| `boothbridge.app` | **PASS** | Not inspected (operator: verify in browser) | **FAIL** — placeholder |
| `www.boothbridge.app` | **PASS** | Cloudflare-terminated | Redirect only |

After Vercel cutover, Vercel provisions Let's Encrypt certificates automatically once DNS propagates.

---

## Automatic Redirect Policy

**Current (live):** `www.boothbridge.app` → `https://boothbridge.app/` (301 via Cloudflare)

**Recommended (post-Vercel):**

- Primary: `boothbridge.app`
- Configure Vercel to redirect `www.boothbridge.app` → `boothbridge.app` (Vercel Dashboard → Domains → redirect www to apex)

This matches existing redirect direction and avoids breaking bookmarks.

---

## Access Gaps

| Missing access | Impact |
|----------------|--------|
| Hostinger hPanel login | Cannot view/edit authoritative DNS zone from this session |
| Vercel Dashboard domain config | Cannot confirm intended Vercel DNS targets |
| SSL certificate PEM inspection | Issuer/expiry not recorded |

---

## How to Verify (Operator Checklist)

1. Log in to **Hostinger** → DNS Zone for `boothbridge.app`
2. Document every record (A, AAAA, CNAME, TXT, MX) before changes
3. In **Vercel** → Project → Settings → Domains → Add `boothbridge.app` and `www.boothbridge.app`
4. Apply Vercel-provided DNS records in Hostinger
5. Wait for propagation (`dig boothbridge.app`, `dig www.boothbridge.app`)
6. Confirm `curl -sI https://boothbridge.app` shows `server: Vercel` (not `LiteSpeed`)
7. Confirm `curl -sI https://www.boothbridge.app` → 301/308 to apex
8. Confirm browser padlock; inspect certificate issuer (Let's Encrypt via Vercel)

---

## Verdict

**FAIL — Domain DNS does not point to Vercel. Apex serves Hostinger placeholder; `www` still aliases legacy Render/Base44 infrastructure.**

DNS cutover is a **P0 blocker** for RC5 production launch.
