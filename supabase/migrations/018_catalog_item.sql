create table if not exists "public"."catalog_item" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "exhibitor_user_id" uuid,
  "exhibitor_profile_id" uuid,
  "event_name" text,
  "title" text,
  "type" text default 'product_catalog',
  "file_url" text,
  "thumbnail_url" text,
  "description" text,
  "download_count" numeric default 0
);

create trigger "trg_catalog_item_updated_date"
before update on "public"."catalog_item"
for each row execute function "public"."set_updated_date"();
