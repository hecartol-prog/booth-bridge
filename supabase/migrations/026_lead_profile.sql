create table if not exists "public"."lead_profile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "lead_name" text,
  "company_id" uuid,
  "company_name" text,
  "email" text,
  "phone" text,
  "country" text,
  "industry" text,
  "source_event_id" uuid,
  "source_event_name" text,
  "source_booth_id" uuid,
  "source_booth_number" text,
  "scan_timestamp" timestamptz,
  "representative_user_id" uuid,
  "interest_categories" jsonb,
  "lead_score" numeric default 0,
  "lead_temperature" text default 'cold',
  "status" text default 'new',
  "follow_up_status" text default 'pending',
  "follow_up_date" date,
  "last_activity" timestamptz,
  "notes" text,
  "buyer_user_id" uuid,
  "engagement_score" numeric default 0,
  "meeting_count" numeric default 0,
  "rfi_count" numeric default 0,
  "booth_visits" numeric default 0,
  "product_views" numeric default 0
);

create trigger "trg_lead_profile_updated_date"
before update on "public"."lead_profile"
for each row execute function "public"."set_updated_date"();
