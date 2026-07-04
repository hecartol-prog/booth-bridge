# BoothBridge Phase 7.7 RC1 Validation Report

**Generated:** 2026-07-04  
**Repository:** `booth-bridge`  
**Branch:** `migration/base44-independence`  
**Architecture under review:** Supabase only  
**Runtime default left unchanged:** `VITE_DATA_BACKEND=base44`

## Executive Summary

RC1 validation found that the Supabase foundation is materially in place, but the current MVP is **not ready** to promote on a Supabase-only basis.

What is solid:

- auth, session, password reset, representative CRUD, RLS, and realtime foundations were already validated live in Phase 7.6
- notification creation was repaired at the data abstraction layer in Phase 7.6B
- major repo-level hardening work was completed in Phase 7.7A for admin claims, storage URL resolution, and AI gateway design
- both frontend builds still pass in this session:
  - `npm run build`
  - `VITE_DATA_BACKEND=supabase npm run build`

What still blocks MVP acceptance:

- buyer-facing Supabase storage access is still misaligned with the actual digital-booth UX for logos, product images, and catalogs
- the `OCRScanner` flow uploads the image but never sends that uploaded image into the AI extraction request
- the AI/OpenRouter workflow has no fresh live RC1 confirmation on the canonical project, and the last live AI run in Phase 7.6 failed on provider authentication
- accepted meetings do not surface correctly on the buyer dashboard because it still queries status `scheduled`

## Readiness Score

**Weighted RC1 readiness score:** `58 / 100`

Scoring basis:

- blocking workflows weighted more heavily than supporting workflows
- any blocked live validation item required for MVP sign-off counted against the score
- repo-only remediation work improved the baseline, but RC1 requires working end-to-end user flows, not just corrected source

## Decision

**Final recommendation:** `STOP — Critical issues detected`

RC2 should not begin until the Critical issues in this report are resolved and a fresh live Supabase-only rerun is completed on the canonical project.

## Validation Scope And Evidence

This RC1 report uses three evidence tiers:

1. **Current source validation in this session**
   - reviewed active app workflows, edge wrappers, storage paths, and role guards
   - confirmed both default and Supabase-targeted builds pass
2. **Prior live Supabase evidence already captured in repo**
   - `docs/phase7-6-end-to-end-validation-report.md`
   - `docs/phase7-6b-stabilization-report.md`
   - `docs/phase7-6d-ai-failover-validation-report.md`
   - `docs/phase7-7a-remediation-report.md`
3. **Current-session live limitations**
   - this shell session has no `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`
   - the Supabase MCP server is visible but not authorized for project queries in this workspace

Because RC1 requires production-readiness confidence, any criterion that needed fresh live confirmation but could not be re-run is treated as a failure for sign-off purposes.

## Acceptance Results

Blocked measurement items are recorded as `FAIL`.

### Authentication

- `AUTH-01` `PASS`
  - Phase 7.6 already validated email/password login, logout, and session refresh successfully against Supabase auth.
- `AUTH-02` `FAIL`
  - Phase 7.6 could not complete public registration because the canonical project hit auth email rate limiting.
  - No fresh RC1 rerun was possible in this session.
- `AUTH-03` `PASS`
  - Phase 7.6 validated password reset with recovery link, token-hash exchange, and successful re-login.
- `AUTH-04` `PASS`
  - Current source uses claim-backed admin checks in `src/api/supabaseAuth.js`, `src/components/layout/AdminLayout.jsx`, and `supabase/functions/_shared/auth.ts`.
  - Phase 7.6 also validated admin JWT claims and admin RLS behavior live.

### Company And Booth Management

- `BOOTH-01` `PASS`
  - The active MVP workflow persists exhibitor company and booth details through `ExhibitorProfile` in `src/pages/Onboarding.jsx` and `src/pages/ExhibitorSetupWizard.jsx`.
  - Underlying `company` and `booth` tables also passed live CRUD in Phase 7.6.
- `BOOTH-02` `PASS`
  - Buyer booth entry from QR works in `src/pages/ScanQR.jsx` and routes into `src/pages/DigitalBooth.jsx`.
- `BOOTH-03` `FAIL`
  - Buyer-facing booth branding is not reliable on the Supabase-only path because logos are stored in owner-only `boothbridge-media/logos/{userId}/...` paths.
  - The digital booth expects a displayable `profile.logo_url`, but signed-URL resolution for a buyer will fail under the current storage policy model.

### Product And Catalog Management

- `PROD-01` `PASS`
  - Exhibitor-side product creation and product image upload exist and the underlying live `product` CRUD passed in Phase 7.6.
- `PROD-02` `FAIL`
  - Product images are uploaded to `boothbridge-media/products/{userId}/...`.
  - `storage_media_owner_select` allows only the owner or admin, so buyer-side signed URL generation for digital-booth products will fail.
- `PROD-03` `FAIL`
  - Catalogs are uploaded to private `boothbridge-assets` paths, but current `storage_assets_scope_select` still checks ownership/admin access rather than buyer-facing share access.
  - The digital booth and catalog library assume buyers can open `cat.file_url`, which is not safe under the current policy shape.

### Storage Uploads And Downloads

- `STOR-01` `PASS`
  - Phase 7.6 validated upload, signed URL generation, and owner download for `boothbridge-media`, `boothbridge-assets`, and `boothbridge-ocr`.
- `STOR-02` `PASS`
  - Phase 7.6 validated non-owner denial behavior for representative media, assets, and OCR paths.
- `STOR-03` `FAIL`
  - The security posture is strong, but it is still mismatched with the intended buyer-facing booth experience for shared exhibitor assets.
  - For RC1, that mismatch is a product failure, not just a policy detail.

### OCR Workflow

- `OCR-01` `FAIL`
  - `src/pages/OCRScanner.jsx` uploads the image to storage, then calls `extractOcrScan({ scanType })` without sending `file_url` or `imageUrl`.
  - `src/api/aiClient.js` still documents this flow as preserving legacy OCR params with no `file_urls`.
- `OCR-02` `FAIL`
  - The review-and-save UI exists, but the end-to-end workflow is broken before reliable extraction can occur.
  - A downstream save path is not enough for RC sign-off when the extraction step is the core of the feature.

### AI Workflow Through OpenRouter

- `AI-01` `FAIL`
  - The repo now contains an OpenRouter-first gateway design, but there is no fresh RC1 live proof that booth assistant chat works on the canonical project after 7.7A.
  - Phase 7.6's last live AI validation failed on provider authentication.
- `AI-02` `FAIL`
  - Document and business-card extraction were not freshly revalidated live in RC1.
  - The OCR screen also has a confirmed caller-side image handoff bug.
- `AI-03` `FAIL`
  - Phase 7.7A improved gateway code and health metadata at the repo level, but the same report explicitly states those changes were not deployed or revalidated live as part of that phase.
  - Operationally, RC1 cannot treat repo-only AI improvements as accepted.

### Meetings

- `MEET-01` `PASS`
  - Meeting create/read/update/delete passed live in Phase 7.6.
  - `src/pages/Meetings.jsx` implements propose, accept, and decline flows.
- `MEET-02` `PASS`
  - Current meeting actions create recipient notifications through the repaired notification abstraction.
- `MEET-03` `FAIL`
  - `src/pages/BuyerDashboard.jsx` still queries buyer meetings with `status: "scheduled"`, while `src/pages/Meetings.jsx` uses `proposed`, `accepted`, and `declined`.
  - Accepted meetings will not surface correctly in the buyer dashboard.

### Connections

- `CONN-01` `PASS`
  - QR and offline-sync paths create or reuse connections in `src/pages/ScanQR.jsx` and `src/hooks/useOfflineSync.js`.
  - Connection CRUD and realtime propagation passed live in Phase 7.6.
- `CONN-02` `PASS`
  - The connection list, notes, and accepted-state views are implemented in `src/pages/Connections.jsx`.
- `CONN-03` `FAIL`
  - `src/pages/Connections.jsx` compares `conn.initiated_by` against `user.role` instead of `user.user_role`.
  - Since non-admin users usually carry `role: "user"` while connection initiators are stored as `buyer`, `exhibitor`, or `nfc`, pending-state actions and waiting-state badges are not reliably assigned to the right role.

### Notifications

- `NOTIF-01` `PASS`
  - The earlier cross-user notification create defect was fixed by disabling select-after-insert for `Notification` in `src/utils/dbClient.js` and `src/utils/supabaseEntity.js`.
- `NOTIF-02` `PASS`
  - Recipient list and mark-read behavior exist in `src/pages/Notifications.jsx` and match the validated recipient-only RLS model.
- `NOTIF-03` `FAIL`
  - Notification freshness is still poll-driven, not realtime.
  - `src/components/layout/AppLayout.jsx` refetches unread notifications every 10 seconds, which is weaker than the expected live-event UX.

### Realtime Synchronization

- `RT-01` `PASS`
  - Phase 7.6 observed connection insert and update propagation to both participants.
- `RT-02` `PASS`
  - Phase 7.6 observed meeting insert and update propagation to both participants.
- `RT-03` `FAIL`
  - Realtime publication only includes `connection` and `meeting` in `supabase/migrations/095_realtime.sql`.
  - User-visible notification freshness still depends on polling.

### Role Permissions

- `ROLE-01` `PASS`
  - Admin access is claim-backed in current source, and non-admin users are redirected away from admin routes.
- `ROLE-02` `PASS`
  - Phase 7.6 validated representative anonymous, non-owner, owner, and admin RLS behavior.
- `ROLE-03` `FAIL`
  - Buyer and Exhibitor experiences are mostly separated by app-role logic instead of route gating, and at least one role-sensitive UI path (`Connections.jsx`) still uses the wrong role field.
  - RC1 should not mark role UX separation complete while that bug remains.

### Performance Gates

- `PERF-01` `FAIL`
  - No fresh end-user authentication latency was captured in RC1.
  - The nearest available auth-adjacent live data remains old `admin-auth` timings from `docs/phase7-4f-deployment-report.md`:
    - empty creds: `1 ms`
    - bad creds: `285 ms`
  - That is not sufficient for sign-off of the actual user auth flow.
- `PERF-02` `FAIL`
  - No fresh storage latency measurement was captured in RC1.
  - Phase 7.6 validated correctness, not quantitative latency.
- `PERF-03` `FAIL`
  - No fresh successful OpenRouter completion latency was captured in RC1.
  - The latest concrete successful AI envelope example in repo remains `842 ms` from `docs/phase7-4e-edge-function-report.md`, but that is not a live RC1 OpenRouter proof.
- `PERF-04` `FAIL`
  - Realtime propagation was observed qualitatively in Phase 7.6, but no numeric propagation measurement was preserved for RC1 sign-off.
- `PERF-05` `FAIL`
  - OCR cannot be timed credibly end-to-end because the current caller path does not pass the uploaded image into extraction.

## Latency Summary

This section records the best available latency evidence, not a full passing RC1 performance certification.

- Authentication
  - Latest available auth-adjacent live measurement: `285 ms` for `admin-auth` bad credentials
  - RC1 status: insufficient for user-auth sign-off
- Storage
  - No fresh numeric RC1 measurement captured
  - RC1 status: failed measurement gate
- AI
  - Latest successful example in repo: `842 ms` handler latency from prior edge-function verification
  - Latest auth/error path examples: `65 ms` for `ai-health` anon JWT and `108 ms` for `ai-generate` anon JWT in older deployment evidence
  - RC1 status: insufficient for live OpenRouter sign-off
- Realtime
  - Qualitative propagation confirmed in prior live validation
  - No numeric RC1 propagation metric captured
- OCR
  - No valid end-to-end timing because the workflow currently fails before a correct extraction request is formed

## Defect Register

### Critical

1. **Buyer-facing shared storage access is still broken for core booth assets.**
   - Impact:
     - buyer cannot reliably view exhibitor logo
     - buyer cannot reliably view product imagery
     - buyer cannot reliably open exhibitor catalogs
   - Evidence:
     - uploads route logos and product images into owner-only `boothbridge-media` paths
     - digital-booth rendering depends on signed URL resolution by the viewer
     - current policies do not provide buyer-facing access for those assets

2. **`OCRScanner` does not send the uploaded image into the AI extraction call.**
   - Impact:
     - OCR workflow cannot be trusted as an end-to-end MVP feature
   - Evidence:
     - `src/pages/OCRScanner.jsx`
     - `src/api/aiClient.js`

3. **AI/OpenRouter MVP workflow is not live-signed-off on the canonical project.**
   - Impact:
     - booth assistant and document extraction cannot be accepted for RC1
   - Evidence:
     - last live AI validation failed in Phase 7.6
     - Phase 7.7A explicitly remediated repo code without deploying or live revalidating those changes

### Major

1. **Buyer dashboard queries the wrong meeting status.**
   - `src/pages/BuyerDashboard.jsx` expects `scheduled`, while live meeting flows use `proposed` and `accepted`.

2. **Connection pending-state UI compares against `user.role` instead of `user.user_role`.**
   - `src/pages/Connections.jsx`

3. **Notifications are not realtime.**
   - Unread state is poll-based every 10 seconds in `src/components/layout/AppLayout.jsx`.

### Minor

1. **Buyer and Exhibitor route separation is still mostly UX-level rather than route-level.**
   - Data safety appears to rely correctly on RLS, but the frontend experience is not as strictly partitioned as an RC build ideally would be.

## What Passed Cleanly

- Supabase-mode build still compiles
- claim-backed admin gating is present in current source
- representative RLS behavior was already validated live
- notification abstraction fix is present in current source
- connection realtime and meeting realtime already passed live validation
- owner-side storage and bucket wiring already passed live validation

## Required Before RC2

1. Fix the buyer-facing storage model for logos, product images, and catalogs so intended shared assets are actually shareable on the Supabase path.
2. Fix `OCRScanner` so it sends the uploaded storage reference into the AI extraction request.
3. Re-run live AI validation on the canonical project after confirming the current OpenRouter-first gateway is deployed and correctly credentialed.
4. Fix the buyer dashboard meeting status query.
5. Fix connection pending-state role checks to use the actual app role.
6. Capture fresh quantitative latency measurements for auth, storage, AI, realtime, and OCR.

## Final Conclusion

The Supabase migration has cleared several foundational and security-oriented hurdles, but RC1 MVP acceptance does **not** pass yet. The remaining blockers are not cosmetic: they affect the buyer-facing booth experience, OCR reliability, and AI readiness, which are all part of the requested MVP validation scope.

**Conclusion:** `STOP — Critical issues detected`
