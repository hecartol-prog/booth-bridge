# RC6 MVP Authentication Simplification

## Objective

Replace OAuth-first authentication with an MVP-focused flow optimized for trade-show reliability and speed, while preserving OAuth implementation code for Phase 2.

## Final Classification

**READY FOR MVP**

## Architecture Decisions

- Email/password is now the only active runtime authentication path in login/register UX.
- Supabase email verification remains mandatory through `signUp` email confirmation flow.
- OAuth abstraction remains intact in `authClient` and `supabaseAuth`, explicitly marked as reserved for Phase 2.
- Business card OCR reuses existing OCR infrastructure (`uploadOcrScan`, `extractOcrScan`, existing sanitizer/validation utilities).
- No schema changes were introduced; registration profile attributes are stored in Supabase auth metadata.

## Screens Modified

- `src/pages/Login.jsx`
  - Removed Google and LinkedIn buttons.
  - Kept only email, password, forgot password, sign in, and create account path.
- `src/pages/Register.jsx`
  - Added method selection screen:
    - Primary: **Scan Business Card**
    - Secondary: **Register Manually**
  - Added unified registration form with required + optional MVP fields.
  - Integrated OCR capture/upload and prefill.
  - Added low-confidence highlighting + explicit user confirmation before OCR-based account creation.
  - Removed OAuth and OTP-first UI from registration runtime path.

## Files Changed

- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/api/supabaseAuth.js`
- `src/api/authClient.js`
- `docs/rc6-mvp-authentication-simplification.md`

## Flow Implemented

1. User opens Register.
2. User chooses one:
   - Register manually
   - Scan business card
3. OCR flow (if selected):
   - Camera/upload
   - OCR extraction
   - Form prefill
   - Low-confidence warning/highlighting
   - User confirmation required
4. User submits registration form with password.
5. Supabase email/password signup executes.
6. User is instructed to verify email before login.
7. User logs in via email/password.

## Validation Results

- Manual registration flow: **implemented**
- OCR-assisted registration flow: **implemented**
- Login flow (email/password only): **implemented**
- Password reset flow: **retained and accessible**
- Supabase email verification: **retained and required**
- OAuth buttons in auth UI: **removed**
- Build: **pass** (`npm run build`)
- Lint: **pass** (`npm run lint`)
- Typecheck: **pass** (`npm run typecheck`)

## OAuth Reactivation Plan (Phase 2)

1. Re-enable OAuth buttons in `Login`/`Register` UI.
2. Keep using existing `authClient.loginWithProvider` and `supabaseAuth.supabaseSignInWithOAuth`.
3. Restore provider UX labels and telemetry flags.
4. Validate Google/LinkedIn provider configuration in Supabase project settings.
5. Run full auth regression (email + OAuth + reset + onboarding).

## Remaining Future Work

- Optional: add per-field OCR confidence from model output (currently overall confidence is used).
- Optional: add telemetry for conversion comparison between manual vs OCR registration.
- Optional: add a dedicated post-signup verification screen with resend controls for onboarding optimization.

## Known Limitations

- OCR uncertainty highlighting uses overall confidence and missing required data; field-level confidence is not currently provided by OCR schema.
- Registration details are currently captured in auth metadata; deeper profile-table hydration remains an onboarding concern.
