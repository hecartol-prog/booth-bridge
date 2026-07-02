create table if not exists "public"."user" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_role" text,
  "onboarded" boolean default false,
  "profile_id" uuid
);

create trigger "trg_user_updated_date"
before update on "public"."user"
for each row execute function "public"."set_updated_date"();
