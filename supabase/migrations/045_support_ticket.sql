create table if not exists "public"."support_ticket" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "ticket_number" text,
  "created_by" uuid,
  "created_by_name" text,
  "assigned_to" uuid,
  "event_id" uuid,
  "event_name" text,
  "priority" text default 'medium',
  "status" text default 'open',
  "category" text default 'other',
  "subject" text,
  "description" text,
  "resolution" text,
  "closed_at" timestamptz,
  "notes" text
);

create trigger "trg_support_ticket_updated_date"
before update on "public"."support_ticket"
for each row execute function "public"."set_updated_date"();
