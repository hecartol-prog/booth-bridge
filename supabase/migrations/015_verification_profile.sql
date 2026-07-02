create table if not exists "public"."verification_profile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "company_id" uuid,
  "company_name" text,
  "verification_status" text default 'unverified',
  "business_license_url" text,
  "business_license_verified" boolean default false,
  "tax_registration_url" text,
  "tax_registration_verified" boolean default false,
  "factory_audit_url" text,
  "factory_audit_verified" boolean default false,
  "certifications" jsonb,
  "trade_references" jsonb,
  "verification_date" date,
  "expiration_date" date,
  "trust_score" numeric default 0,
  "profile_completion_score" numeric default 0,
  "response_speed_score" numeric default 0,
  "meeting_attendance_score" numeric default 0,
  "rfi_response_rate" numeric default 0,
  "reviewed_by_user_id" uuid,
  "reviewer_notes" text
);

create trigger "trg_verification_profile_updated_date"
before update on "public"."verification_profile"
for each row execute function "public"."set_updated_date"();
