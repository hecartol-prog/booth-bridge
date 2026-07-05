# Phase 7.8B — Supabase Infrastructure Audit

**Generated:** 2026-07-05  
**Canonical project:** `jjqhmvfzqpohvukoxeoe`  
**Region:** ap-northeast-1 (per Phase 7.4F)  
**CLI:** Supabase 2.109.0, linked to canonical project

## Executive Summary

Live infrastructure on the canonical Supabase project is **production-ready** for database, storage, RLS, realtime publication, and Edge Functions. All 47 repository migrations are applied; no pending migrations. Ten Edge Functions are **ACTIVE** at version 2.

## Database

| Check | Result | Evidence |
|-------|--------|----------|
| Migrations applied | ✅ 47/47 | `supabase db push --linked --dry-run` → "Remote database is up to date" |
| Pending migrations | ✅ None | Same dry-run |
| Latest migration | `095_realtime` | `supabase_migrations.schema_migrations` |
| Public tables | 39 | Live SQL |
| RLS enabled | 39/39 | `SELECT count(*) ... rowsecurity` |
| RLS policies (public) | 94 | Phase 7.5B design; applied via `092_enable_rls.sql` |
| Constraints / indexes | Applied | `091_constraints.sql`, `090_indexes.sql` |

### Migration history tail

| Version | Name |
|---------|------|
| 091 | constraints |
| 092 | enable_rls |
| 093 | storage_setup |
| 094 | storage_policies |
| 095 | realtime |

Local file count under `supabase/migrations/`: **47** — matches remote.

## Storage

### Buckets (live)

| Bucket | Public | Repo match (`093_storage_setup.sql`) |
|--------|--------|--------------------------------------|
| `boothbridge-media` | `false` | ✅ |
| `boothbridge-assets` | `false` | ✅ |
| `boothbridge-ocr` | `false` | ✅ |

### Storage policies

| Check | Result |
|-------|--------|
| Policy count on `storage.objects` | **16** (matches `094_storage_policies.sql`) |
| Admin full access | `storage_admin_*` policies |
| Owner-scoped media | `storage_media_owner_*` |
| Scoped assets / catalogs | `storage_assets_scope_*` |
| OCR owner isolation | `storage_ocr_owner_*` |
| Event branding path | Covered in `094` (Phase 7.7A remediation) |

Policies align with `src/config/storageBuckets.js` path conventions.

## Realtime

| Check | Result |
|-------|--------|
| Realtime enabled (config) | `supabase/config.toml` → `[realtime] enabled = true` |
| Published tables | `connection`, `meeting` |
| Matches app `db.subscribe()` usage | ✅ (`095_realtime.sql`) |

Tables **not** published (by design): `notification` and others — app uses polling or one-shot fetch for those entities.

## Auth

| Component | Status | Notes |
|-----------|--------|-------|
| Email/password | Configured | `enable_signup = true` in `config.toml` |
| OAuth (Google, LinkedIn) | Partially validated | Initiation URLs work (Phase 7.6); callback needs browser pass |
| JWT expiry | 3600s (1h) | `config.toml` |
| Refresh token rotation | Enabled | `enable_refresh_token_rotation = true` |
| Admin role claim | `app_metadata.role` | Hardened Phase 7.7A — not `user_metadata` |
| SMTP (production email) | ⚠️ Not configured in repo | Dashboard operator task for production email deliverability |

## Edge Functions

Live inventory (`supabase functions list`):

| Function | Status | Version | `verify_jwt` |
|----------|--------|---------|--------------|
| `admin-auth` | ACTIVE | 2 | false |
| `ai-health` | ACTIVE | 2 | true |
| `ai-generate` | ACTIVE | 2 | true |
| `ai-chat` | ACTIVE | 2 | true |
| `ai-document` | ACTIVE | 2 | true |
| `ai-business-card` | ACTIVE | 2 | true |
| `ai-summary` | ACTIVE | 2 | true |
| `ai-classify` | ACTIVE | 2 | true |
| `ai-match` | ACTIVE | 2 | true |
| `ai-recommend` | ACTIVE | 2 | true |

Repo function count: **10** — full parity.

Shared modules deployed with functions: `_shared/aiGateway.ts`, `auth.ts`, `handler.ts`, `cors.ts`, `envelope.ts`.

## RLS Summary

- All 39 `public` tables: RLS **ON**
- Anonymous: no write policies; discovery reads on exhibitor-facing entities only
- Authenticated: owner / participant / company-scoped per entity
- Admin: `private.is_admin()` via `app_metadata.role`
- Service role: bypasses RLS (Supabase default) — confined to Edge Functions

## Gaps / Operational Tasks

| Item | Severity | Action |
|------|----------|--------|
| Production SMTP for auth emails | Medium | Configure in Supabase Dashboard |
| OAuth redirect URLs for production domain | Medium | Add `https://boothbridge.app/**` to Auth settings |
| Database backups / PITR | Medium | Verify Supabase plan includes PITR; document RPO/RTO |
| Connection pooling (Pro) | Low | Enable if traffic warrants |

## Classification

**Infrastructure: PASS** — schema, RLS, storage, realtime, and Edge Function deployment are aligned with the repository.
