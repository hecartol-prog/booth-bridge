# RC7 - MVP Polish & Production UX Hardening

## Scope

Polish-only release focused on MVP production quality.  
No OAuth reintroduction, no auth architecture change, no schema/migration/Edge Function/RLS/backend routing changes.

## Files Modified

- `src/pages/Register.jsx`
- `src/pages/Login.jsx`
- `src/pages/VerifyEmail.jsx` (new)
- `src/components/AuthErrorBoundary.jsx` (new)
- `src/components/AuthLayout.jsx`
- `src/App.jsx`
- `src/api/supabaseAuth.js`
- `docs/rc7-mvp-polish-report.md`

## UX Improvements

- Registration flow refined into guided steps:
  - Choose registration method
  - Scan card
  - Extracting state
  - Review extracted data
  - Continue
  - Create account
- OCR UX hardening:
  - Loading animation and progress messaging
  - Progress indicator across OCR stages
  - Confidence severity coloring:
    - High: green
    - Medium: yellow
    - Low: red
  - Explicit user confirmation required before OCR registration submit
  - Retry + manual fallback path when OCR/upload fails
- Manual registration validation:
  - Real-time email validation
  - Real-time password strength validation
  - Real-time password confirmation feedback
  - Required field checks before submit
  - Register button disabled until all validations pass
- Password UX:
  - Show/hide toggles
  - Strength meter
  - Requirement checklist (8+, uppercase, lowercase, number, special char)
  - Live validation
- Email verification:
  - Dedicated `VerifyEmail` page
  - Actions: Open Email, Resend, Change Email
  - Automatic verification session detection and redirect
- Login hardening:
  - Friendly categorized error messaging for wrong password/user-not-found/unverified/network/server failures
  - No raw Supabase errors surfaced
- Loading states:
  - Improved async progress messaging for sign-in, registration, OCR extraction, resend verification
  - Buttons disabled during async actions

## Accessibility Improvements

- Added `aria-live`/`role="alert"` for auth error messaging.
- Improved keyboard usability:
  - Password visibility toggles are keyboard focusable and labeled.
  - Logo interaction in auth layout changed to accessible button.
- Focus visibility strengthened for logo interaction.
- Maintained form submit via Enter key across auth forms.

## Mobile Improvements

- Registration/OCR button groups adapt to stacked layout on narrow screens.
- Auth surfaces keep constrained width and avoid action overflow.
- Auth interactions reviewed for 320-414 widths and tablet responsive behavior.

## Company Data Preparation

- Company value normalized before registration save:
  - Trim whitespace
  - Collapse duplicate spaces
  - Case-normalize to title case

## User Profile Separation Review

- Auth metadata was reduced to minimal MVP keys:
  - `display_name`
  - `role`
  - `onboarding_complete`
- Business profile data is no longer written into auth metadata.
- Existing profile-entity write path from registration was assessed as higher-risk for RC7 due unknown column contracts and onboarding dependencies.
- **Phase 2**: move registration profile fields to canonical user profile entity with explicit mapping and migration-safe rollout.

## Validation Results

- `npm run lint` - PASS
- `npm run typecheck` - PASS
- `npm run build` - PASS

## Remaining Phase 2 Work

- Persist registration profile fields (company/title/phone/country) into canonical profile entity with backward-compatible read model.
- Add field-level OCR confidence in AI schema to improve precision highlighting.
- Extend auth monitoring/observability for pilot telemetry and drop-off analytics.
