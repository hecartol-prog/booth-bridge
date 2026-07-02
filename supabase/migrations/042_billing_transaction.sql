create table if not exists "public"."billing_transaction" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "subscription_id" uuid,
  "provider" text,
  "provider_transaction_id" text,
  "type" text default 'charge',
  "status" text default 'pending',
  "amount" numeric default 0,
  "currency" text default 'USD',
  "description" text,
  "invoice_url" text,
  "receipt_url" text,
  "metadata" jsonb
);

create trigger "trg_billing_transaction_updated_date"
before update on "public"."billing_transaction"
for each row execute function "public"."set_updated_date"();
