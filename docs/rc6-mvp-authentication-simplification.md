# RC6 MVP Authentication Simplification

## Objective

Replace OAuth-first authentication with a trade-show-first MVP flow:

- Email/password registration
- Supabase email verification
- OCR-assisted registration
- Manual registration

Google and LinkedIn OAuth remain in code but are removed from MVP runtime UI paths.

## Files Changed

- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/api/authClient.js`
- `src/api/supabaseAuth.js`
- `src/api/supabaseClient.js`
- `src/lib/AuthContext.jsx`
- `src/components/layout/AdminLayout.jsx`
- `src/App.jsx`
- `src/vite-env.d.ts`
- `vercel.json`
- `docs/rc6-mvp-authentication-simplification.md`

## Architecture Decisions

- Kept authentication abstraction layer intact: `authClient` delegates to `supabaseAuth`.
- Removed OAuth entry points from Login/Register runtime UI.
- Preserved OAuth implementation and provider mapping for future reactivation.
- Added explicit Phase 2 comments on OAuth functions to prevent accidental MVP runtime usage.
- Kept Supabase email verification flow active via `signUp(... options.emailRedirectTo ...)`.
- Reused existing OCR extraction pipeline (`extractOcrScan`) for registration prefill.
- Pre-auth registration OCR sends the image as a data URL to the AI gateway (no storage upload), avoiding Supabase Storage RLS that requires `auth.uid()` on `scans/{userId}/...` paths.
- Added `vercel.json` SPA rewrites so client routes resolve on Vercel.

## Screens Modified

- **Login (`/login`)**
  - Email
  - Password
  - Forgot password
  - Sign in
  - Create account link
  - No OAuth buttons

- **Register (`/register`)**
  - Screen 1: Mode selection
    - Primary: Scan Business Card
    - Secondary: Register Manually
  - Screen 2: Registration form
    - Required: First Name, Last Name, Email, Company, Password, Confirm Password
    - Optional: Job Title, Phone, Country
    - OCR mode pre-fills fields and shows confidence
    - Low-confidence OCR enforces explicit user confirmation

## Validation Checklist

- [ ] Registration works manually (manual QA pending)
- [ ] Registration works after OCR prefill (manual QA pending)
- [ ] Login works (manual QA pending)
- [ ] Password reset works (manual QA pending)
- [ ] Email verification works (manual QA pending)
- [x] No remaining OAuth buttons in auth runtime UI
- [x] Build passes
- [x] Lint passes
- [x] Typecheck passes

### Command Outputs

- `npm run lint` -> pass (`eslint . --quiet`)
- `npm run typecheck` -> pass (`tsc -p ./jsconfig.json`)
- `npm run build` -> pass (`vite build`)

## OAuth Reactivation Plan (Phase 2)

1. Reintroduce OAuth buttons in `Login` and/or `Register`.
2. Route button handlers back to `auth.loginWithProvider(...)`.
3. Verify Supabase provider configuration and callback/origin allow-lists.
4. Run regression for:
   - Email/password login + signup
   - Password reset
   - Email verification
   - OAuth login paths
5. Optional: add feature flag for controlled rollout.

## Known Limitations

- OCR prefill quality depends on image quality and card layout.
- Low-confidence handling currently highlights key required fields conservatively.
- Registration metadata is captured in auth metadata; downstream profile normalization still occurs in onboarding/profile flows.
- OCR registration images are not persisted to storage until after sign-in (by design for pre-auth MVP flow).

## Final Classification

READY FOR MVP
