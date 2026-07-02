create table if not exists "public"."nfc_profile" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "nfc_identifier" text,
  "profile_url" text,
  "display_name" text,
  "company" text,
  "position" text,
  "email" text,
  "phone" text,
  "whatsapp" text,
  "linkedin" text,
  "website" text,
  "booth_number" text,
  "event_id" uuid,
  "event_name" text,
  "country" text,
  "avatar_url" text,
  "active" boolean default true,
  "tap_count" numeric default 0
);

create trigger "trg_nfc_profile_updated_date"
before update on "public"."nfc_profile"
for each row execute function "public"."set_updated_date"();
