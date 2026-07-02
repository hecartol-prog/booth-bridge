create table if not exists "public"."company" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "company_name" text,
  "legal_name" text,
  "website" text,
  "industry" text,
  "sub_industry" text,
  "country" text,
  "state" text,
  "city" text,
  "address" text,
  "year_founded" numeric,
  "employee_count_range" text,
  "annual_revenue_range" text,
  "manufacturing_capabilities" jsonb,
  "target_markets" jsonb,
  "export_markets" jsonb,
  "import_markets" jsonb,
  "description" text,
  "linkedin_url" text,
  "logo_url" text,
  "verification_status" text default 'unverified',
  "trust_score" numeric default 0,
  "profile_completeness" numeric default 0,
  "created_by_user_id" uuid,
  "subscription_plan" text default 'free',
  "is_active" boolean default true
);

create trigger "trg_company_updated_date"
before update on "public"."company"
for each row execute function "public"."set_updated_date"();
