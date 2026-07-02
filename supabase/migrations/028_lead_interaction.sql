create table if not exists "public"."lead_interaction" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "buyer_user_id" uuid,
  "exhibitor_user_id" uuid,
  "interaction_type" text,
  "points" numeric default 0,
  "event_name" text,
  "metadata" jsonb
);

create trigger "trg_lead_interaction_updated_date"
before update on "public"."lead_interaction"
for each row execute function "public"."set_updated_date"();
