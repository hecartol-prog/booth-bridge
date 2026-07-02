create table if not exists "public"."opportunity_post" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "posted_by_user_id" uuid,
  "posted_by_name" text,
  "posted_by_company" text,
  "posted_by_role" text,
  "title" text,
  "description" text,
  "opportunity_type" text default 'looking_for_supplier',
  "product_categories" jsonb,
  "target_countries" jsonb,
  "event_name" text,
  "status" text default 'active',
  "responses_count" numeric default 0
);

create trigger "trg_opportunity_post_updated_date"
before update on "public"."opportunity_post"
for each row execute function "public"."set_updated_date"();
