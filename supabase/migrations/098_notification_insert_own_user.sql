-- Fix: Restrict notification inserts to the caller's own user_id only.
-- Cross-user (system) notifications go through create_notification_for_user
-- (SECURITY DEFINER), which is the server-side path for notifying other users.

drop policy if exists "notification_authenticated_insert" on public.notification;

create policy "notification_authenticated_insert" on public.notification
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated callers may notify another user via this elevated function.
-- Direct table inserts for another user's user_id are blocked by RLS above.
create or replace function public.create_notification_for_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_from_user_name text default null,
  p_related_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  insert into public.notification (
    user_id,
    type,
    title,
    message,
    from_user_name,
    related_id
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_from_user_name,
    p_related_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_notification_for_user(uuid, text, text, text, text, uuid) from public;
grant execute on function public.create_notification_for_user(uuid, text, text, text, text, uuid) to authenticated;
