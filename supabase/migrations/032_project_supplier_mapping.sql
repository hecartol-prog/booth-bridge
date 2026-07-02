create table if not exists "public"."project_supplier_mapping" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "project_id" uuid,
  "buyer_id" uuid,
  "exhibitor_user_id" uuid,
  "exhibitor_profile_id" uuid,
  "company_name" text,
  "booth_number" text,
  "event_name" text,
  "evaluation_notes" text,
  "moq" numeric,
  "lead_time_days" numeric,
  "certifications" text,
  "tooling_capability" text,
  "export_markets" text,
  "rating" numeric,
  "status" text default 'shortlisted'
);

create trigger "trg_project_supplier_mapping_updated_date"
before update on "public"."project_supplier_mapping"
for each row execute function "public"."set_updated_date"();
