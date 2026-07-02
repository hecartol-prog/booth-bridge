create table if not exists "public"."rfi" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "connection_id" uuid,
  "buyer_user_id" uuid,
  "exhibitor_user_id" uuid,
  "request_type" text,
  "message" text,
  "reply" text,
  "reply_attachment_url" text,
  "status" text default 'pending',
  "buyer_name" text,
  "buyer_company" text,
  "exhibitor_company" text
);

create trigger "trg_rfi_updated_date"
before update on "public"."rfi"
for each row execute function "public"."set_updated_date"();
