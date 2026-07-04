# Phase 7.5B Security Report

## Scope
This batch implements the BoothBridge security foundation for:

- Row Level Security on all `39` public tables
- Private Supabase Storage buckets and object policies
- Realtime publication for the tables that currently use `db.subscribe()`

This phase intentionally does **not** modify React pages, components, Edge Functions, Base44 runtime code, or the existing client abstractions.

## Deliverables
Created files:

- `supabase/migrations/092_enable_rls.sql`
- `supabase/migrations/093_storage_setup.sql`
- `supabase/migrations/094_storage_policies.sql`
- `supabase/migrations/095_realtime.sql`
- `docs/phase7-5b-security-report.md`

## Verification Summary
Static verification against the migration files in this branch:

- Public tables audited: `39`
- Tables with `ENABLE ROW LEVEL SECURITY`: `39`
- RLS policies created: `94`
- Storage policies created: `16`
- Buckets created/configured: `3`
- Realtime tables published: `2`

Notes:

- No deployment was performed in this phase.
- No seed-data work or runtime rewiring was performed.
- Existing migrations `001` through `091` do not define prior RLS, storage-object policies, bucket creation, or realtime publication, so the new migrations do not conflict with the current local migration chain.

## RLS Summary
Access model applied in `092_enable_rls.sql`:

- `admin` users retain full access through `app_metadata.role = 'admin'`
- authenticated users can access their own rows where ownership exists
- company-owned rows use company ownership through `company.created_by_user_id`
- anonymous users receive no table write policies and no anonymous read policies
- service-role access remains intact through Supabase's normal bypass behavior

High-level access categories:

- Authenticated discovery reads: `event`, `exhibitor_profile`, `product`, `catalog_item`, `nfc_profile`
- Self-only or participant-scoped data: `user`, `buyer_profile`, `connection`, `rfi`, `meeting`, `meeting_request`, `media`, `saved_booth`, `saved_product`, `lead_interaction`, `notification`, `sourcing_project`, `project_supplier_mapping`, `integration_connection`, `integration_sync_log`, `nfc_interaction`, `scanned_contact`
- Company-scoped or mixed company/user access: `company`, `verification_profile`, `booth`, `lead_profile`, `lead_intelligence`, `match_recommendation`
- Admin-dominant operational tables: `admin_access_log`, `system_alert`, `stress_test_result`

## Policy Matrix
Per-table policy inventory:

- `user`: `user_admin_all`, `user_self_all`
- `event`: `event_admin_all`, `event_authenticated_read`
- `company`: `company_admin_all`, `company_owner_all`
- `exhibitor_profile`: `exhibitor_profile_admin_all`, `exhibitor_profile_authenticated_read`, `exhibitor_profile_owner_all`
- `buyer_profile`: `buyer_profile_admin_all`, `buyer_profile_owner_all`
- `verification_profile`: `verification_profile_admin_all`, `verification_profile_company_owner_all`
- `booth`: `booth_admin_all`, `booth_company_access_all`
- `product`: `product_admin_all`, `product_authenticated_read`, `product_owner_all`
- `catalog_item`: `catalog_item_admin_all`, `catalog_item_authenticated_read`, `catalog_item_owner_all`
- `connection`: `connection_admin_all`, `connection_participant_all`
- `rfi`: `rfi_admin_all`, `rfi_participant_all`
- `meeting`: `meeting_admin_all`, `meeting_participant_read`, `meeting_participant_update`, `meeting_participant_delete`, `meeting_creator_insert`
- `meeting_request`: `meeting_request_admin_all`, `meeting_request_participant_read`, `meeting_request_participant_update`, `meeting_request_participant_delete`, `meeting_request_requester_insert`
- `media`: `media_admin_all`, `media_access_read`, `media_owner_insert`, `media_owner_update`, `media_owner_delete`
- `saved_booth`: `saved_booth_admin_all`, `saved_booth_buyer_all`
- `saved_product`: `saved_product_admin_all`, `saved_product_buyer_all`
- `lead_profile`: `lead_profile_admin_all`, `lead_profile_member_all`
- `lead_intelligence`: `lead_intelligence_admin_all`, `lead_intelligence_member_all`
- `lead_interaction`: `lead_interaction_admin_all`, `lead_interaction_participant_all`
- `activity`: `activity_admin_all`, `activity_actor_company_all`
- `notification`: `notification_admin_all`, `notification_recipient_read`, `notification_recipient_update`, `notification_recipient_delete`, `notification_authenticated_insert`
- `sourcing_project`: `sourcing_project_admin_all`, `sourcing_project_buyer_all`
- `project_supplier_mapping`: `project_supplier_mapping_admin_all`, `project_supplier_mapping_member_all`
- `match_recommendation`: `match_recommendation_admin_all`, `match_recommendation_member_all`
- `opportunity_post`: `opportunity_post_admin_all`, `opportunity_post_owner_all`
- `integration_connection`: `integration_connection_admin_all`, `integration_connection_user_all`
- `integration_sync_log`: `integration_sync_log_admin_all`, `integration_sync_log_member_all`
- `nfc_profile`: `nfc_profile_admin_all`, `nfc_profile_authenticated_read`, `nfc_profile_owner_all`
- `nfc_interaction`: `nfc_interaction_admin_all`, `nfc_interaction_participant_read`, `nfc_interaction_participant_update`, `nfc_interaction_participant_delete`, `nfc_interaction_initiator_insert`
- `nfc_product_tag`: `nfc_product_tag_admin_all`, `nfc_product_tag_owner_all`
- `scanned_contact`: `scanned_contact_admin_all`, `scanned_contact_scanner_all`
- `billing_subscription`: `billing_subscription_admin_all`, `billing_subscription_user_read`
- `billing_transaction`: `billing_transaction_admin_all`, `billing_transaction_member_read`
- `premium_booth_subscription`: `premium_booth_subscription_admin_all`, `premium_booth_subscription_owner_read`
- `sponsored_listing`: `sponsored_listing_admin_all`, `sponsored_listing_owner_all`
- `support_ticket`: `support_ticket_admin_all`, `support_ticket_participant_all`
- `admin_access_log`: `admin_access_log_admin_all`
- `system_alert`: `system_alert_admin_all`
- `stress_test_result`: `stress_test_result_admin_all`

Ownership helper functions added under `private`:

- `private.is_admin()`
- `private.is_company_owner(uuid)`
- `private.is_exhibitor_profile_owner(uuid)`
- `private.is_buyer_profile_owner(uuid)`
- `private.is_connection_participant(uuid)`
- `private.is_lead_profile_member(uuid)`
- `private.is_sourcing_project_member(uuid)`
- `private.is_integration_connection_owner(uuid)`
- `private.is_product_owner(uuid)`
- `private.is_billing_subscription_owner(uuid)`
- `private.is_asset_folder_owner(text)`

## Storage Summary
`093_storage_setup.sql` creates or updates the three canonical private buckets:

- `boothbridge-media`
  - private
  - file size limit: `50 MB`
  - allowed MIME families: `image/*`, `video/*`, `application/pdf`, Word document MIME types
  - expected folders: `uploads/{userId}/...`, `logos/{userId}/...`, `products/{userId}/...`

- `boothbridge-assets`
  - private
  - file size limit: `100 MB`
  - allowed MIME families: `image/*`, `video/*`, `application/pdf`
  - expected folders: `companies/{companyOrProfileId}/catalogs/...`, `uploads/{userId}/catalogs/...`, `events/{eventId}/branding/...`

- `boothbridge-ocr`
  - private
  - file size limit: `15 MB`
  - allowed MIME families: `image/*`, `application/pdf`
  - expected folders: `scans/{userId}/...`

## Storage Policy Summary
`094_storage_policies.sql` creates `16` storage object policies:

- Admin override across all three buckets:
  - `storage_admin_select`
  - `storage_admin_insert`
  - `storage_admin_update`
  - `storage_admin_delete`

- Media owner policies:
  - `storage_media_owner_select`
  - `storage_media_owner_insert`
  - `storage_media_owner_update`
  - `storage_media_owner_delete`

- Asset scoped policies:
  - `storage_assets_scope_select`
  - `storage_assets_scope_insert`
  - `storage_assets_scope_update`
  - `storage_assets_scope_delete`

- OCR owner policies:
  - `storage_ocr_owner_select`
  - `storage_ocr_owner_insert`
  - `storage_ocr_owner_update`
  - `storage_ocr_owner_delete`

Storage-specific implementation notes:

- OCR reads for Edge Functions rely on service-role bypass rather than a separate `storage.objects` policy.
- Asset catalog policies intentionally support both company-folder ownership and exhibitor-profile-folder ownership because current upload callers sometimes pass `profile.id` into the `companyId` slot.
- Event-branding paths remain private and admin-managed under the current policy set.

## Realtime Summary
`095_realtime.sql` publishes only the tables currently wired to `db.subscribe()`:

- `connection`
- `meeting`

Tables **not** published in this batch:

- `notification`
- `lead_interaction`

Reason:

- current repository usage only subscribes to `db.Connection.subscribe()` and `db.Meeting.subscribe()`
- no active `db.Notification.subscribe()` or `db.LeadInteraction.subscribe()` call sites were found

## Anonymous and REST Exposure Review
Security outcomes in this batch:

- no anonymous insert, update, or delete policies were added
- no anonymous read policies were added
- all public-schema tables now have RLS enabled
- direct REST access now requires either admin access, row ownership, participant scope, or an explicitly authenticated discovery-read policy

Tables intentionally left readable to authenticated users for app discovery flows:

- `event`
- `exhibitor_profile`
- `product`
- `catalog_item`
- `nfc_profile`

## Security Risks Remaining
Remaining risks after this batch:

- `notification` still uses client-side row creation. Reads are locked to the recipient, but the insert policy must stay broader than ideal until notification writes move behind a trusted server or Edge Function path.
- Catalog asset folder semantics are still mixed. The storage policy supports both company UUID folders and exhibitor-profile UUID folders, but the app should be normalized to one canonical identifier.
- Several admin/organizer analytics pages still rely on broad `.list()` access patterns. The new RLS model is secure, but those surfaces should be smoke-tested after migration application to ensure role gating and query behavior match expectations.
- Some rarely used tables are protected with baseline owner/company rules without a dedicated server-side workflow yet. If those tables later gain privileged writes, the write paths should move to trusted backends rather than browser-only clients.

## Production Readiness
Status: **conditionally ready**

What is ready:

- migration set is complete for RLS, storage buckets, storage policies, and realtime publication
- policy counts and coverage are fully defined in-versioned SQL
- local migration chain has no prior security migration conflicts

What must happen before calling the system production-ready:

- apply the migrations to the canonical Supabase project `jjqhmvfzqpohvukoxeoe`
- run post-apply verification against live table policies, storage buckets, and realtime publication state
- smoke-test admin and organizer pages that currently depend on wide list queries
- decide whether notification writes should remain client-originated or be moved to a trusted execution path

## Blockers Before Phase 7.5C
- These migrations have not been applied yet to the canonical project in this phase.
- Live verification for bucket state, publication membership, and effective RLS behavior is still pending.
- Notification write-hardening and catalog folder normalization remain follow-up security items.
