-- Sync auth.users → public.user so profile FKs (buyer_profile, exhibitor_profile) always resolve.

begin;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."user" (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Backfill any auth users created before this trigger existed.
insert into public."user" (id)
select au.id
from auth.users au
left join public."user" pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

-- Callable from the client when a session exists but public.user row is missing.
create or replace function public.ensure_app_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public."user" (id)
  values (uid)
  on conflict (id) do nothing;

  return uid;
end;
$$;

revoke all on function public.ensure_app_user() from public;
grant execute on function public.ensure_app_user() to authenticated;

commit;
