# BoothBridge MVP Acceptance Criteria

**Phase:** 7.7 RC1  
**Architecture under validation:** Supabase only  
**Runtime switch policy:** keep `VITE_DATA_BACKEND=base44` as the current default until RC validation passes

## Purpose

This document defines the minimum acceptance bar for BoothBridge's MVP on the Supabase architecture. It is intentionally focused on end-user workflows, role permissions, and production-readiness gates, not feature expansion.

At RC sign-off:

- every criterion below must be marked `PASS` or `FAIL`
- any blocked or unmeasured critical criterion counts as `FAIL`
- any Critical defect blocks RC promotion

## Roles

- `Admin`: platform operator with claim-based admin access
- `Exhibitor`: supplier-side booth owner or booth staff user
- `Buyer`: attendee-side sourcing user

## Severity Rules

- `Critical`: blocks MVP launch or invalidates a core workflow
- `Major`: important workflow degradation with a workaround
- `Minor`: non-blocking issue, polish gap, or ancillary regression

## Performance Gates

These are RC1 performance gates for MVP readiness:

- `PERF-01` Authentication: successful sign-in should complete in under 2 seconds on a warm path; missing measurement is a fail.
- `PERF-02` Storage: upload plus signed-URL availability for a small asset should complete in under 3 seconds; missing measurement is a fail.
- `PERF-03` AI: a successful OpenRouter-backed request should return in under 8 seconds on the primary path; missing live completion data is a fail.
- `PERF-04` Realtime: connection and meeting updates should propagate to the second participant in under 2 seconds; missing measurement is a fail.
- `PERF-05` OCR: upload plus extraction to review-ready state should complete in under 10 seconds; missing measurement is a fail.

## Authentication

- `AUTH-01` Existing users can sign in with email/password, refresh a session, and sign out using Supabase auth.
- `AUTH-02` New user registration and OTP/email verification complete successfully on the canonical Supabase project.
- `AUTH-03` Password reset completes end-to-end and the user can sign in with the new password.
- `AUTH-04` Admin access is granted only from claim-backed admin authority and non-admin users are rejected from admin routes.

## Company And Booth Management

- `BOOTH-01` An exhibitor can complete onboarding or setup and persist company name, booth number, event name, and logo.
- `BOOTH-02` A buyer can open an exhibitor's digital booth from a QR or equivalent connection entry point.
- `BOOTH-03` A buyer can see the exhibitor's booth branding and core profile assets in the digital booth without broken media.

## Product And Catalog Management

- `PROD-01` An exhibitor can create and view products with images on the Supabase path.
- `PROD-02` A buyer can see product imagery in the digital booth on the Supabase path.
- `PROD-03` A buyer can open or download exhibitor catalogs and documents from the digital booth.

## Storage Uploads And Downloads

- `STOR-01` Owner-scoped uploads succeed for the canonical private buckets: `boothbridge-media`, `boothbridge-assets`, and `boothbridge-ocr`.
- `STOR-02` Owner-scoped signed URLs and downloads work, and unauthorized cross-user access is denied.
- `STOR-03` The storage policy model also allows the intended buyer-facing shared assets to be displayed or downloaded where the product expects them to be public-to-authenticated viewers.

## OCR Workflow

- `OCR-01` The OCR scanner uploads the scan image and passes the uploaded image into the AI extraction request.
- `OCR-02` A user can review extracted OCR fields and save a `ScannedContact` successfully.

## AI Workflow Through OpenRouter

- `AI-01` The booth assistant chat flow works through the Supabase edge gateway with OpenRouter as the primary route.
- `AI-02` Document and business-card extraction edge functions execute successfully with authenticated requests.
- `AI-03` The AI gateway exposes healthy operational behavior for provider selection, bounded failover, and usable health output.

## Meetings

- `MEET-01` A user can propose a meeting from an accepted connection or equivalent exhibitor context.
- `MEET-02` The recipient can accept or decline the meeting and the proposer receives the resulting notification.
- `MEET-03` Upcoming accepted meetings appear in the buyer-facing meeting surfaces and dashboards.

## Connections

- `CONN-01` A buyer booth visit creates or reuses the expected connection record without duplicate corruption.
- `CONN-02` Users can view accepted connections and add private notes.
- `CONN-03` Pending and initiator states are shown to the correct role and the correct user actions are offered.

## Notifications

- `NOTIF-01` Cross-user notifications can be created from connection, RFI, and meeting flows without RLS or abstraction failures.
- `NOTIF-02` Recipients can read notifications and mark them as read.
- `NOTIF-03` Notification visibility updates quickly enough for live-event usage.

## Realtime Synchronization

- `RT-01` Connection inserts and updates propagate to both participants via Supabase Realtime.
- `RT-02` Meeting inserts and updates propagate to both participants via Supabase Realtime.
- `RT-03` User-visible live-event surfaces that claim freshness do not rely on stale data beyond acceptable UX tolerance.

## Role Permissions

- `ROLE-01` Admin-only routes and admin UI require a valid admin role claim.
- `ROLE-02` RLS correctly separates anonymous, non-owner, owner, and admin access for representative core entities.
- `ROLE-03` Buyer and Exhibitor workflows expose the correct UX and actions for the signed-in app role.

## Release Decision Rules

- `READY FOR RC2`: all Critical criteria pass; only Major or Minor issues remain
- `READY FOR PHASE 8`: all criteria pass and no open defects remain that would undermine the MVP cutover
- `STOP — Critical issues detected`: any Critical workflow fails, or any required performance measurement is missing for a blocking workflow
