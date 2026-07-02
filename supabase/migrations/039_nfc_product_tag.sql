create table if not exists "public"."nfc_product_tag" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "product_id" uuid,
  "supplier_user_id" uuid,
  "event_id" uuid,
  "event_name" text,
  "tag_code" text,
  "tag_label" text,
  "active_status" boolean default true,
  "tap_count" numeric default 0,
  "save_count" numeric default 0,
  "quote_request_count" numeric default 0
);

create trigger "trg_nfc_product_tag_updated_date"
before update on "public"."nfc_product_tag"
for each row execute function "public"."set_updated_date"();
