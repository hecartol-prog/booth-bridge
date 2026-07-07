# RC5-6 — Storage Production Validation

**Generated:** 2026-07-06  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**Buckets (repo):** `boothbridge-media`, `boothbridge-assets`, `boothbridge-ocr`

---

## Executive Summary

| Operation | RC5 live test | Historical (Phase 7.6) |
|-----------|---------------|------------------------|
| Upload | **NOT VERIFIED** | **PASS** |
| Download | **NOT VERIFIED** | **PASS** |
| Delete | **NOT VERIFIED** | **PASS** |
| Signed URLs | **NOT VERIFIED** | **PASS** |
| OCR bucket | **NOT VERIFIED** | **PASS** |
| Media bucket | **NOT VERIFIED** | **PASS** |
| Assets bucket | **NOT VERIFIED** | **PASS** |
| RLS / cross-user | **NOT VERIFIED** | **PASS** |
| Company isolation | **NOT VERIFIED** | **PASS** |
| Bucket enumeration (anon) | Returns `[]` | N/A |

---

## Configuration (repository evidence)

| Bucket | Privacy | Paths (examples) |
|--------|---------|-------------------|
| `boothbridge-media` | Private | `logos/{userId}/`, `products/{userId}/`, `uploads/{userId}/` |
| `boothbridge-assets` | Private | `companies/{companyId}/catalogs/`, `events/{eventId}/branding/` |
| `boothbridge-ocr` | Private | `scans/{userId}/` |

Migrations: `093_storage_setup.sql`, `094_storage_policies.sql` (16 policies).

Client abstraction: `src/api/storageClient.js` → Supabase Storage API when `VITE_DATA_BACKEND=supabase`.

---

## Live RC5 Tests

### Bucket list (anon)

```text
GET https://jjqhmvfzqpohvukoxeoe.supabase.co/storage/v1/bucket
apikey: <anon>
Authorization: Bearer <anon>

→ HTTP 200
→ Body: []
```

| Interpretation |
|----------------|
| Anon role cannot enumerate buckets (common for locked-down projects) — **not proof buckets are missing** |

### Upload / download / signed URL

**NOT EXECUTED** in RC5. Full storage harness in `scripts/phase7-6-e2e-validation.mjs` requires `SUPABASE_SERVICE_ROLE_KEY` and was **not run** (validator security policy).

---

## Phase 7.6 Historical Results (reference)

From `docs/phase7-6-end-to-end-validation-report.md`:

| Bucket | Upload | Download | Delete | Cross-user |
|--------|--------|----------|--------|------------|
| `boothbridge-media` | Pass | Pass | Pass | Other user: signed URL **not found** |
| `boothbridge-assets` | Pass | Pass | Pass | Other user: download **not found** |
| `boothbridge-ocr` | Pass | Pass | Pass | Non-owner delete attempt: object **still existed** |

Cross-user denial behavior: **PASS** (isolation enforced).

---

## RLS & Company Isolation (design)

| Control | Mechanism |
|---------|-----------|
| Private buckets | `public: false` in storage setup migration |
| Object policies | Owner `auth.uid()` match on path prefixes; company-scoped reads via SQL helper `private.storage_object_ref()` |
| Client signed URLs | `createSignedUrl()` after ownership check in `storageClient.js` |

**Live RC5 cross-company attempt:** **NOT VERIFIED**

---

## Production Frontend Dependency

Storage operations from the UI require:

1. Vercel deploy with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
2. Authenticated user session
3. CORS: Supabase Storage allows project origin (add `https://boothbridge.app` after deploy)

**Browser smoke (upload logo, business card, OCR):** **NOT POSSIBLE** — app not on production domain.

---

## How to Verify (Operator Checklist)

1. Supabase Dashboard → Storage → confirm 3 buckets exist, all **private**
2. Deploy frontend to Vercel with Supabase env vars
3. As **Exhibitor A:** upload logo → verify image renders via signed URL
4. As **Exhibitor B:** attempt direct access to A's object path → expect failure
5. OCR scan upload → confirm object in `boothbridge-ocr` bucket (Dashboard)
6. Re-run harness:

```bash
export SUPABASE_URL=https://jjqhmvfzqpohvukoxeoe.supabase.co
export SUPABASE_ANON_KEY=<anon>
export SUPABASE_SERVICE_ROLE_KEY=<service_role>
node scripts/phase7-6-e2e-validation.mjs
```

---

## Verdict

**NOT VERIFIED live in RC5** — infrastructure was validated in Phase 7.6; **no fresh production storage smoke** executed this session.

**Conditional confidence:** schema and policies are deployed (migrations applied). Re-run E2E harness post-deploy for **PASS** sign-off.
