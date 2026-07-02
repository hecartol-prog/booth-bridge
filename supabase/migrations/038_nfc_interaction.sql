create table if not exists "public"."nfc_interaction" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "initiator_user_id" uuid,
  "target_user_id" uuid,
  "nfc_identifier" text,
  "event_id" uuid,
  "event_name" text,
  "interaction_type" text default 'badge_tap',
  "timestamp" timestamptz,
  "notes" text,
  "lead_points" numeric default 10,
  "synced" boolean default false
);

create trigger "trg_nfc_interaction_updated_date"
before update on "public"."nfc_interaction"
for each row execute function "public"."set_updated_date"();
