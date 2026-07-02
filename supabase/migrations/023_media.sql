create table if not exists "public"."media" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "connection_id" uuid,
  "uploaded_by" uuid,
  "type" text,
  "url" text,
  "caption" text,
  "product_title" text
);

create trigger "trg_media_updated_date"
before update on "public"."media"
for each row execute function "public"."set_updated_date"();
