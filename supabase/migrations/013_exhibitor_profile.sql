create table if not exists "public"."exhibitor_profile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "company_name" text,
  "booth_number" text,
  "hall" text,
  "event_name" text,
  "event_id" uuid,
  "logo_url" text,
  "description" text,
  "country" text,
  "website" text,
  "whatsapp" text,
  "product_categories" jsonb,
  "factory_type" text default 'manufacturer',
  "certifications" jsonb,
  "catalogue_url" text,
  "team_members" jsonb,
  "digital_card" jsonb
);

create trigger "trg_exhibitor_profile_updated_date"
before update on "public"."exhibitor_profile"
for each row execute function "public"."set_updated_date"();
