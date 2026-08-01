-- Fix 14: Restrict notification INSERT so authenticated users cannot
-- create notifications for arbitrary recipients.
-- Requires from_user_id so senders can notify others while remaining attributable.

alter table public.notification
  add column if not exists from_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_notification_from_user_id'
  ) then
    alter table public.notification
      add constraint fk_notification_from_user_id
      foreign key (from_user_id) references public."user" (id)
      on delete set null
      deferrable initially deferred;
  end if;
end $$;

create index if not exists idx_notification_from_user_id
  on public.notification (from_user_id);

drop policy if exists "notification_authenticated_insert" on public.notification;
create policy "notification_authenticated_insert"
  on public.notification
  for insert
  to authenticated
  with check (auth.uid() = user_id or auth.uid() = from_user_id);
