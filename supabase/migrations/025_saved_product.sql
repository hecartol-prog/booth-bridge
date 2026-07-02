create table if not exists "public"."saved_product" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "buyer_id" uuid,
  "product_id" uuid,
  "event_id" uuid,
  "event_name" text,
  "exhibitor_user_id" uuid,
  "exhibitor_company" text,
  "product_title" text,
  "product_image_url" text,
  "notes" text,
  "collection" text,
  "interest_level" text default 'medium'
);

create trigger "trg_saved_product_updated_date"
before update on "public"."saved_product"
for each row execute function "public"."set_updated_date"();
