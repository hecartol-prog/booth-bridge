create table if not exists "public"."scanned_contact" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "scanned_by_user_id" uuid,
  "scan_type" text default 'business_card',
  "first_name" text,
  "last_name" text,
  "full_name" text,
  "position" text,
  "company" text,
  "department" text,
  "email" text,
  "phone" text,
  "mobile" text,
  "whatsapp" text,
  "website" text,
  "address" text,
  "country" text,
  "city" text,
  "linkedin" text,
  "badge_number" text,
  "industry" text,
  "booth_number" text,
  "event_id" uuid,
  "event_name" text,
  "raw_image_url" text,
  "ocr_confidence" numeric default 0,
  "notes" text,
  "follow_up_status" text default 'pending',
  "linked_lead_id" uuid,
  "linked_project_id" uuid
);

create trigger "trg_scanned_contact_updated_date"
before update on "public"."scanned_contact"
for each row execute function "public"."set_updated_date"();
