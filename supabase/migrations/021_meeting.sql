create table if not exists "public"."meeting" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "connection_id" uuid,
  "proposed_by" uuid,
  "proposed_to" uuid,
  "proposed_time" timestamptz,
  "duration" numeric,
  "status" text default 'proposed',
  "counter_time" timestamptz,
  "title" text,
  "location" text,
  "proposer_name" text,
  "recipient_name" text
);

create trigger "trg_meeting_updated_date"
before update on "public"."meeting"
for each row execute function "public"."set_updated_date"();
