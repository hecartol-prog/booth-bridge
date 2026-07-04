begin;

-- Only publish tables that currently use db.subscribe() in the application.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'connection'
  ) then
    alter publication supabase_realtime add table public.connection;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meeting'
  ) then
    alter publication supabase_realtime add table public.meeting;
  end if;
end
$$;

commit;
