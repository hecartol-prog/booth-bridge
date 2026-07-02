create table if not exists "public"."admin_access_log" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "admin_id" uuid,
  "email" text,
  "login_timestamp" timestamptz,
  "logout_timestamp" timestamptz,
  "ip_address" text,
  "browser" text,
  "device" text,
  "action_performed" text default 'login',
  "status" text default 'success',
  "notes" text
);

create trigger "trg_admin_access_log_updated_date"
before update on "public"."admin_access_log"
for each row execute function "public"."set_updated_date"();
