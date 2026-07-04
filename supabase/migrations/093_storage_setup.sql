begin;

-- Canonical private buckets for Phase 7.5B.
-- Folder conventions are enforced by storage object policies in 094_storage_policies.sql:
--   boothbridge-media  -> uploads/{userId}/..., logos/{userId}/..., products/{userId}/...
--   boothbridge-assets -> companies/{companyOrProfileId}/catalogs/..., uploads/{userId}/catalogs/..., events/{eventId}/branding/...
--   boothbridge-ocr    -> scans/{userId}/...

insert into storage.buckets (
  id,
  name,
  public,
  allowed_mime_types,
  file_size_limit
)
values
  (
    'boothbridge-media',
    'boothbridge-media',
    false,
    array[
      'image/*',
      'video/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::text[],
    52428800
  ),
  (
    'boothbridge-assets',
    'boothbridge-assets',
    false,
    array[
      'image/*',
      'video/*',
      'application/pdf'
    ]::text[],
    104857600
  ),
  (
    'boothbridge-ocr',
    'boothbridge-ocr',
    false,
    array[
      'image/*',
      'application/pdf'
    ]::text[],
    15728640
  )
on conflict (id) do update
set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

commit;
