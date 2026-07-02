create table if not exists "public"."product" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "exhibitor_user_id" uuid,
  "exhibitor_profile_id" uuid,
  "title" text,
  "description" text,
  "image_url" text,
  "event_name" text
);

create trigger "trg_product_updated_date"
before update on "public"."product"
for each row execute function "public"."set_updated_date"();
