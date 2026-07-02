create table if not exists "public"."premium_booth_subscription" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "exhibitor_id" uuid,
  "plan_type" text default 'standard',
  "status" text default 'trial',
  "start_date" date,
  "end_date" date,
  "payment_status" text default 'pending',
  "auto_renew" boolean default false,
  "stripe_subscription_id" text,
  "amount_paid" numeric default 0
);

create trigger "trg_premium_booth_subscription_updated_date"
before update on "public"."premium_booth_subscription"
for each row execute function "public"."set_updated_date"();
