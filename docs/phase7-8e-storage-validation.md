# Phase 7.8E — Storage Validation

**Generated:** 2026-07-05  
**Client:** `src/api/storageClient.js` → `src/api/supabaseStorage.js`  
**Buckets:** `src/config/storageBuckets.js`

## Executive Summary

All three canonical private buckets exist on the live project with 16 storage policies matching the repository. Phase 7.6 live tests confirmed upload, signed URL, download, and ownership enforcement. Phase 7.7A added signed-URL resolution in `supabaseEntity.js` for private asset fields rendered in the UI.

## Buckets

| Bucket | Purpose | Max size | Public | Live |
|--------|---------|----------|--------|------|
| `boothbridge-media` | Logos, products, general uploads | 50 MB | false | ✅ |
| `boothbridge-assets` | Catalogs, company assets, event branding | 100 MB | false | ✅ |
| `boothbridge-ocr` | OCR scan images | 15 MB | false | ✅ |

## Path Conventions

| Destination | Bucket | Path pattern |
|-------------|--------|--------------|
| `media` | media | `uploads/{userId}/...` |
| `logo` | media | `logos/{userId}/...` |
| `product` | media | `products/{userId}/...` |
| `catalog` | assets | `companies/{companyId}/catalogs/...` or `uploads/{userId}/catalogs/...` |
| `ocr` | ocr | `scans/{userId}/...` |
| `event_branding` | assets | `events/{eventId}/branding/...` |

## Operation Matrix (Phase 7.6 live + static)

| Operation | Media | Assets | OCR | Notes |
|-----------|-------|--------|-----|-------|
| Upload (owner) | ✅ | ✅ | ✅ | Authenticated insert policies |
| Download (owner) | ✅ | ✅ | ✅ | Via signed URL or authenticated get |
| Signed URLs | ✅ | ✅ | ✅ | `storageClient.getSignedUrl()` |
| Delete (owner) | ✅ | ✅ | ✅ | Owner delete policies |
| Delete (non-owner) | ✅ Blocked | ✅ Blocked | ✅ Blocked | Object retained after unauthorized delete attempt |
| Shared read (catalog/logo in DB) | ✅ | ✅ | — | `private.is_shared_*` helpers |
| Admin override | ✅ | ✅ | ✅ | `storage_admin_*` policies |

## Ownership Enforcement

- Folder segment `[2]` must equal `auth.uid()` for owner paths
- Cross-user signed URL generation returns **Object not found** (Phase 7.6)
- RLS on `storage.objects` — not public buckets

## UI / Signed URL Alignment (Phase 7.7A)

Persisted fields resolved to signed URLs in entity layer:

- `file_url`, `logo_url`, `image_url`, `thumbnail_url`, `banner_url`, `product_image_url`, `raw_image_url`

Upload-preview pages patched: `OCRScanner`, `Products`, `Onboarding`, `ExhibitorSetupWizard`, admin catalog/exhibitor pages.

## Bucket Permissions vs Repo

| Policy group | Repo (`094`) | Live count |
|--------------|--------------|------------|
| Admin (select/insert/update/delete) | 4 | Included in 16 |
| Media owner | 4 | ✅ |
| Assets scope | 4 | ✅ |
| OCR owner | 4 | ✅ |

**Match: YES**

## Known Limitations

1. `storage.remove()` may not surface RLS denial as an error — verify by re-fetching object (Phase 7.6 observation).
2. Raw `http` URLs in legacy rows bypass bucket policies — migration data only.
3. Service role must never be used from the browser.

## Classification

**Storage: PASS** — buckets, policies, and live ownership tests align with production design.
