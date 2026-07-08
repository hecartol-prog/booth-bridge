# RC8 Base44 Inventory (Pre-Removal)

Date: 2026-07-08  
Objective: inventory every Base44 dependency before deletion during RC8 final migration.

## 1) Package Dependencies

- `@base44/sdk` in `package.json` dependencies.
- `@base44/vite-plugin` in `package.json` dependencies.
- Both also present in `package-lock.json`.

## 2) Vite Build Integration

- `vite.config.js` imports `@base44/vite-plugin`.
- `vite.config.js` registers `base44(...)` plugin options (`legacySDKImports`, `hmrNotifier`, `navigationNotifier`, `analyticsTracker`, `visualEditAgent`).
- Build envs tied to plugin behavior:
  - `BASE44_LEGACY_SDK_IMPORTS`
  - `VITE_BASE44_APP_BASE_URL` (indirect plugin warning path in prior reports)

## 3) Runtime Imports and Branching (Critical)

- `src/api/base44Client.js`
  - imports `createClient` from `@base44/sdk`
  - exports `base44` singleton used by other runtime clients
- `src/config/backend.js`
  - `VITE_DATA_BACKEND`
  - `isBase44()` and `isSupabase()` backend switch
- `src/utils/dbClient.js`
  - imports `base44Client`
  - `makeBase44Entity(...)`
  - `if (isBase44())` routing branch
- `src/api/storageClient.js`
  - imports `base44Client`
  - Base44 upload/signed-url branches
  - multiple `if (isBase44())` checks
- `src/api/aiGateway.js`
  - imports `base44Client`
  - Base44 integrations branch for LLM/document extraction/health
- `src/api/aiClient.js`
  - imports and uses `isBase44()`
  - conditional logic for provider name and recommend/match/invoke legacy behavior
- `src/lib/app-params.js`
  - Base44 URL/localStorage token/app params plumbing
  - uses `VITE_BASE44_*`
- `src/vite-env.d.ts`
  - declares `VITE_DATA_BACKEND`
  - declares `VITE_BASE44_*`
- `public/sw.js`
  - runtime hostname condition `url.hostname.includes('base44')`
- `index.html`
  - favicon points to `media.base44.com`
- `src/config/branding.js`
  - app logo points to `media.base44.com`

## 4) Dead Code / Rollback / Legacy Utility Candidates

- Rollback architecture:
  - `src/config/backend.js` (`VITE_DATA_BACKEND` dual-backend switch)
  - Base44 conditional paths in `dbClient`, `storageClient`, `aiGateway`, `aiClient`
- Base44 singleton:
  - `src/api/base44Client.js` (delete target)
- Legacy app params utility:
  - `src/lib/app-params.js` (only consumed by `base44Client.js`)
- Legacy Base44 TS declaration:
  - `src/types/base44-auth.d.ts` (unused once SDK removed)
- Legacy export tooling (non-runtime app code but Base44-dependent):
  - `scripts/phase6/**` references Base44 SDK/env/contracts
- Reference bundle:
  - `base44/**` (entities/functions/config snapshots, migration history artifacts)

## 5) Environment Variables Inventory

- Frontend `VITE_*`:
  - `VITE_DATA_BACKEND`
  - `VITE_BASE44_APP_ID`
  - `VITE_BASE44_FUNCTIONS_VERSION`
  - `VITE_BASE44_APP_BASE_URL`
- Non-VITE:
  - `BASE44_APP_ID`
  - `BASE44_APP_BASE_URL`
  - `BASE44_FUNCTIONS_VERSION`
- Tracked in:
  - `src/lib/app-params.js`
  - `src/vite-env.d.ts`
  - `scripts/phase6/lib/base44-client.mjs`
  - `scripts/phase6/lib/resolve-app-id.mjs`
  - migration/handoff docs

## 6) Legacy Types

- `src/types/base44-auth.d.ts` declares `@base44/sdk` client surface.

## 7) Documentation with Base44 References

- Many files under `docs/**` and `README.md` contain migration-history references.
- Expected to remain for historical traceability unless explicitly rewritten.
- RC8 target is zero runtime references, not zero historical documentation references.

## 8) Search Baseline (Before RC8 Removal)

Repository-wide matches found for:

- `base44`
- `Base44`
- `@base44`
- `base44Client`
- `base44.auth`
- `base44.entities`
- `base44.functions`
- `base44.integrations`

Primary runtime code hotspots are all under `src/` plus `vite.config.js`.

