create table if not exists "public"."billing_subscription" (
  "id" uuid primary key default gen_random_uuid(),
  "created_date" timestamptz not null default now(),
  "updated_date" timestamptz,
  "legacy_base44_id" text,
  "user_id" uuid,
  "plan_id" text,
  "plan_name" text,
  "plan_type" text default 'premium_booth',
  "status" text default 'trial',
  "provider" text default 'stripe',
  "provider_subscription_id" text,
  "provider_customer_id" text,
  "amount" numeric default 0,
  "currency" text default 'USD',
  "interval" text default 'monthly',
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean default false,
  "trial_end" timestamptz,
  "features_unlocked" jsonb,
  "metadata" jsonb
);

create trigger "trg_billing_subscription_updated_date"
before update on "public"."billing_subscription"
for each row execute function "public"."set_updated_date"();
