# Phase 7.4C — Storage Migration Report

**Generated:** 2026-07-03  
**Scope:** Storage abstraction only (`storageClient`, `assetPipeline`, bucket mapping)  
**Runtime default:** `VITE_DATA_BACKEND=base44` (unchanged)  
**Prior phase:** [7.4B Authentication Migration](./phase7-4b-authentication-migration-report.md)

---

## Final recommendation

### **READY FOR PHASE 7.4D**

Storage is fully abstracted behind `storageClient.js` with Base44 and Supabase branches. `assetPipeline.js` owns bucket mapping and semantic upload helpers. No pages import Base44 storage integrations directly. Base44 remains the default runtime and compiles cleanly. Supabase storage paths compile when `VITE_DATA_BACKEND=supabase`.

**Minor actions before live Supabase storage testing:**

1. Create buckets `boothbridge-assets`, `boothbridge-media`, `boothbridge-ocr` in Supabase Dashboard.
2. Configure Storage CORS for preview/production origins.
3. Author bucket policies during Phase 7.5 (RLS deferred per phase constraints).
4. When cutting over, wire `resolveDisplayUrl()` for `<img src>` tags that currently bind raw `file_url` / `logo_url` (private Supabase refs need signed URLs at render time).
5. Migrate static logo URLs from `media.base44.com` to `/public/logo.png` or a public bucket (P3 — intentionally retained for Base44 compatibility).

---

## 1. Storage Dependency Report

### 1.1 Pre-migration audit (upload / retrieval paths)

| Path | File(s) | Pre-7.4C | Post-7.4C |
|------|---------|----------|-----------|
| OCR scan upload | `OCRScanner.jsx` | `storageClient.uploadFile` | `assetPipeline.uploadOcrScan` → `boothbridge-ocr` |
| Onboarding logo | `Onboarding.jsx` | `uploadFile` | `uploadCompanyLogo` → `boothbridge-media/logos/` |
| Onboarding card scan | `Onboarding.jsx` | `uploadFile` | `uploadOcrScan` → `boothbridge-ocr` |
| Exhibitor wizard logo | `ExhibitorSetupWizard.jsx` | `uploadFile` | `uploadCompanyLogo` |
| Exhibitor wizard product image | `ExhibitorSetupWizard.jsx` | `uploadFile` | `uploadProductImage` |
| Exhibitor wizard catalog | `ExhibitorSetupWizard.jsx` | `uploadFile` | `uploadCatalog` |
| Product images | `Products.jsx` | `uploadFile` | `uploadProductImage` |
| Catalog library | `CatalogLibrary.jsx` | `uploadFile` | `uploadCatalog` |
| Admin catalogues | `AdminCatalogues.jsx` | `uploadFile` | `uploadCatalog` / `uploadMedia` (thumb) |
| Admin exhibitors logo | `AdminExhibitors.jsx` | `uploadFile` | `uploadCompanyLogo` |
| Admin media library | `AdminMedia.jsx` | `uploadFile` | `uploadMedia` |
| Signed URL gateway | `assetPipeline.js` | `storage.getSignedUrl` | Unchanged (via `storageClient`) |
| Catalog download | `assetPipeline.js` | `downloadCatalog` | Unchanged |
| Base44 integrations | `storageClient.js` only | `UploadFile`, `CreateFileSignedUrl` | Base44 branch only |

### 1.2 Direct Base44 storage imports

| Location | Status |
|----------|--------|
| `src/pages/**` | **None** ✅ |
| `src/hooks/**` | **None** ✅ |
| `src/components/**` | **None** ✅ |
| `src/utils/assetPipeline.js` | Imports `storage` from `storageClient` only ✅ |
| `src/api/storageClient.js` | Sole consumer of `base44.integrations.Core.UploadFile` / `CreateFileSignedUrl` ✅ |

### 1.3 `media.base44.com` references (legacy static branding)

| File | Purpose | Action |
|------|---------|--------|
| `index.html` | Favicon | Retained — static public asset |
| `AuthLayout.jsx` | Logo | Retained — documented legacy |
| `AppLayout.jsx` | Logo | Retained — documented legacy |
| `AdminLayout.jsx` | Logo | Retained — documented legacy |
| `AdminLogin.jsx` | Logo | Retained — documented legacy |
| `Onboarding.jsx` | Decorative logo | Retained — documented legacy |

No user-uploaded content depends on `media.base44.com`. Upload flows route through `storageClient`.

### 1.4 Modules not modified (per constraints)

| Module | Modified |
|--------|----------|
| `authClient.js` | **No** |
| `dbClient.js` | **No** |
| `aiClient.js` | **No** |
| RLS / seed data | **No** |
| Runtime switch | **No** (`VITE_DATA_BACKEND=base44` default) |

---

## 2. Implemented public API (`storageClient.js`)

| Method | Base44 delegate | Supabase implementation |
|--------|-----------------|-------------------------|
| `upload(file, options)` | `integrations.Core.UploadFile` | `supabase.storage.from(bucket).upload()` |
| `uploadFile` | Alias of `upload` | Same |
| `download(fileRef, options)` | Signed URL + `fetch` → Blob | `storage.download()` |
| `remove(fileRef, options)` | Not supported (throws) | `storage.remove()` |
| `list({ bucket, path, limit, offset })` | Not supported (throws) | `storage.list()` |
| `getSignedUrl(fileRef, options)` | `CreateFileSignedUrl` / http passthrough | `createSignedUrl()` |
| `getPublicUrl(filePath, bucket)` | http passthrough only | `getPublicUrl()` |
| `exists(fileRef, options)` | Signed URL probe | `list` search |
| `createFolder(bucket, path)` | Not supported (throws) | `.keep` placeholder upload |
| `deleteFolder(bucket, path)` | Not supported (throws) | Prefix list + remove |
| `copy(fileRef, destPath, options)` | Not supported (throws) | `storage.copy()` |
| `move(fileRef, destPath, options)` | Not supported (throws) | copy + remove |

### Backward-compatible exports

`storage` default export object, `uploadFile`, `BUCKETS`, `DEFAULT_BUCKET`

### Stored reference format (Supabase)

New uploads store canonical refs: `{bucket}/{path}` (e.g. `boothbridge-media/logos/user-id/logo.png`).  
`getSignedUrl` parses bucket prefix or accepts `options.bucket`. Legacy Base44 URIs and `http(s)` URLs pass through unchanged.

---

## 3. Backend split

```
Pages
    └── assetPipeline.js (semantic uploads + signed URL gateway)
            └── storageClient.js
                    ├── isBase44() → base44.integrations.Core.*
                    └── isSupabase() → supabaseStorage.js → getSupabaseClient().storage.*
```

Switch exclusively via `VITE_DATA_BACKEND`. No mixed runtime.

### New files

| File | Role |
|------|------|
| `src/config/storageBuckets.js` | Bucket constants, destination resolver, path builders, ref parser |
| `src/api/supabaseStorage.js` | Internal Supabase Storage implementation |

---

## 4. Bucket Mapping Report

### 4.1 Canonical buckets

| Bucket | Visibility | Purpose |
|--------|------------|---------|
| `boothbridge-assets` | Private | Event branding, company catalogs |
| `boothbridge-media` | Private | Logos, products, admin media library |
| `boothbridge-ocr` | Private | OCR / badge scan images |

### 4.2 Upload destination → bucket/path

| `destination` / helper | Bucket | Path pattern |
|------------------------|--------|--------------|
| `ocr` / `uploadOcrScan` | `boothbridge-ocr` | `scans/{userId}/{filename}` |
| `media` / `uploadMedia` | `boothbridge-media` | `uploads/{userId}/{filename}` |
| `logo` / `uploadCompanyLogo` | `boothbridge-media` | `logos/{userId}/{filename}` |
| `product` / `uploadProductImage` | `boothbridge-media` | `products/{userId}/{filename}` |
| `catalog` / `uploadCatalog` | `boothbridge-assets` | `companies/{companyId}/catalogs/{filename}` or `uploads/{userId}/catalogs/{filename}` |
| `event_branding` / `uploadEventBranding` | `boothbridge-assets` | `events/{eventId}/branding/{filename}` |
| `general` (default) | `boothbridge-media` | `uploads/{userId}/{filename}` |

### 4.3 Page → helper mapping

| Page | Helper(s) |
|------|-----------|
| `OCRScanner.jsx` | `uploadOcrScan` |
| `Onboarding.jsx` | `uploadCompanyLogo`, `uploadOcrScan` |
| `ExhibitorSetupWizard.jsx` | `uploadCompanyLogo`, `uploadProductImage`, `uploadCatalog` |
| `Products.jsx` | `uploadProductImage` |
| `CatalogLibrary.jsx` | `uploadCatalog` |
| `AdminCatalogues.jsx` | `uploadCatalog`, `uploadMedia` |
| `AdminExhibitors.jsx` | `uploadCompanyLogo` |
| `AdminMedia.jsx` | `uploadMedia` |

---

## 5. Asset Pipeline Report

### 5.1 Changes

- Removed Base44-specific comments; all I/O via `storageClient`.
- Added destination-aware upload helpers (`uploadOcrScan`, `uploadMedia`, `uploadCompanyLogo`, `uploadProductImage`, `uploadCatalog`, `uploadEventBranding`).
- Path builders moved to `storageBuckets.js` and re-exported.
- Added `resolveDisplayUrl()` for future signed-URL rendering at cutover.
- `getSignedUrl`, `downloadCatalog`, `buildAssetRegistryEntry`, `uploadAsset` preserved.

### 5.2 Import graph

```
assetPipeline.js
  → storageClient.js (only storage import)
  → storageBuckets.js (path constants)
```

No page imports `storageClient` directly for uploads (only `assetPipeline`).

---

## 6. Repository Compatibility Report

| Check | Result |
|-------|--------|
| Pages import Base44 storage | **None** ✅ |
| Hooks import Base44 storage | **None** ✅ |
| Duplicate upload implementations | **None** — single `storageClient` + `assetPipeline` helpers ✅ |
| `supabaseStorage` leaked to pages | **None** — internal module only ✅ |
| Broken imports | **None** ✅ |
| `npm run build` (base44) | **Pass** ✅ |
| `npm run build` (supabase env) | **Pass** ✅ |
| Public `uploadFile` API | **Preserved** (alias of `upload`) ✅ |

---

## 7. Zero Regression Audit

| Test | Result |
|------|--------|
| `npm run build` with default env | ✅ Exit 0 |
| `npm run build` with `VITE_DATA_BACKEND=supabase` + placeholder Supabase env | ✅ Exit 0 |
| Base44 upload path | ✅ Delegates to `UploadFile` (unchanged behavior) |
| Base44 signed URL path | ✅ Delegates to `CreateFileSignedUrl` |
| Supabase branch compiles | ✅ Tree-shaken at build; runtime requires configured project |
| `authClient` untouched | ✅ |
| `dbClient` untouched | ✅ |
| `aiClient` untouched | ✅ |
| No backend-specific imports in pages | ✅ |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Supabase buckets not provisioned | Medium | Create buckets before preview cutover (minor action #1) |
| Private refs in `<img src>` without signing | Medium | Use `resolveDisplayUrl()` when switching backend (minor action #4) |
| Base44 `remove`/`list`/`copy` not available | Low | Documented throws; entity delete remains in `dbClient` |
| Legacy `file_url` values mixed after partial migration | Medium | `getSignedUrl` handles http, Base44 URI, and `bucket/path` formats |
| Storage policies absent | Medium | Deferred to Phase 7.5 per RLS constraint |
| Static logos on `media.base44.com` | Low | Independent of upload pipeline; migrate in Phase 8 |

---

## 9. Files changed

| File | Change |
|------|--------|
| `src/api/storageClient.js` | Full public API + dual backend |
| `src/api/supabaseStorage.js` | **New** — Supabase implementation |
| `src/config/storageBuckets.js` | **New** — buckets + destination mapping |
| `src/utils/assetPipeline.js` | Semantic upload helpers, storageClient-only I/O |
| `src/pages/OCRScanner.jsx` | `uploadOcrScan` |
| `src/pages/Onboarding.jsx` | `uploadCompanyLogo`, `uploadOcrScan` |
| `src/pages/ExhibitorSetupWizard.jsx` | Destination helpers |
| `src/pages/Products.jsx` | `uploadProductImage` |
| `src/pages/CatalogLibrary.jsx` | `uploadCatalog` |
| `src/pages/admin/AdminCatalogues.jsx` | `uploadCatalog`, `uploadMedia` |
| `src/pages/admin/AdminExhibitors.jsx` | `uploadCompanyLogo` |
| `src/pages/admin/AdminMedia.jsx` | `uploadMedia` |

**Not modified:** `authClient`, `dbClient`, `aiClient`, `base44Client`, routing, RLS, seed scripts.

---

**Next:** Phase 7.4D — `aiClient` Supabase / Edge Function implementation.
