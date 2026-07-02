create table if not exists "public"."match_recommendation" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "buyer_user_id" uuid,
  "buyer_company_id" uuid,
  "recommended_exhibitor_user_id" uuid,
  "recommended_company_id" uuid,
  "recommended_company_name" text,
  "recommended_product_id" uuid,
  "recommended_event_id" uuid,
  "recommended_booth_id" uuid,
  "recommendation_type" text default 'supplier',
  "recommendation_score" numeric default 0,
  "recommendation_reason" text,
  "match_factors" jsonb,
  "status" text default 'pending',
  "event_name" text
);

create trigger "trg_match_recommendation_updated_date"
before update on "public"."match_recommendation"
for each row execute function "public"."set_updated_date"();
