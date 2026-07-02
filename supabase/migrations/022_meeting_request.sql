create table if not exists "public"."meeting_request" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "requested_by_user_id" uuid,
  "requested_by_name" text,
  "requested_by_company" text,
  "target_exhibitor_user_id" uuid,
  "target_exhibitor_company" text,
  "event_id" uuid,
  "event_name" text,
  "booth_id" uuid,
  "booth_number" text,
  "meeting_purpose" text,
  "products_of_interest" jsonb,
  "priority" text default 'medium',
  "preferred_dates" jsonb,
  "preferred_time" text,
  "notes" text,
  "status" text default 'pending',
  "meeting_id" uuid,
  "calendly_url" text,
  "calendly_event_id" text,
  "calendly_scheduled_time" timestamptz,
  "meeting_score" numeric default 0,
  "outcome_notes" text,
  "outcome" text
);

create trigger "trg_meeting_request_updated_date"
before update on "public"."meeting_request"
for each row execute function "public"."set_updated_date"();
