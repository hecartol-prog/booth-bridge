create table if not exists "public"."notification" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "type" text,
  "title" text,
  "message" text,
  "related_id" uuid,
  "read" boolean default false,
  "from_user_name" text
);

create trigger "trg_notification_updated_date"
before update on "public"."notification"
for each row execute function "public"."set_updated_date"();
