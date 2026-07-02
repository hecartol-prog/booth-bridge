create table if not exists "public"."booth" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "event_id" uuid,
  "event_name" text,
  "company_id" uuid,
  "company_name" text,
  "exhibitor_user_id" uuid,
  "exhibitor_profile_id" uuid,
  "booth_number" text,
  "hall" text,
  "section" text,
  "floor" text,
  "booth_type" text default 'standard',
  "booth_size" text,
  "coordinates_x" numeric,
  "coordinates_y" numeric,
  "status" text default 'available',
  "is_premium" boolean default false,
  "sponsor_level" text default 'none',
  "primary_representative_id" uuid,
  "secondary_representative_id" uuid,
  "notes" text,
  "live_status" text default 'offline',
  "total_visits" numeric default 0,
  "total_leads" numeric default 0,
  "total_meetings" numeric default 0
);

create trigger "trg_booth_updated_date"
before update on "public"."booth"
for each row execute function "public"."set_updated_date"();
