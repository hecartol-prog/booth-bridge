create table if not exists "public"."sourcing_project" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "buyer_id" uuid,
  "project_name" text,
  "description" text,
  "target_moq" numeric,
  "required_certifications" text,
  "target_countries" jsonb,
  "budget_range" text,
  "deadline" date,
  "status" text default 'active',
  "metadata" text
);

create trigger "trg_sourcing_project_updated_date"
before update on "public"."sourcing_project"
for each row execute function "public"."set_updated_date"();
