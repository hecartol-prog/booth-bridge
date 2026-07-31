# AGENTS.md

## Cursor Cloud specific instructions

Booth Bridge is a single Vite + React (JavaScript) SPA (`booth-bridge`) whose backend
is Supabase (Postgres + Auth + Storage + Edge Functions). There is no separate backend
service to run — the frontend talks directly to Supabase. For a self-contained local dev
environment, run Supabase locally with the Supabase CLI (Docker) and point the app at it.

Standard commands live in `package.json` (`dev`, `build`, `lint`, `typecheck`, `test:e2e`).
Notes below are the non-obvious bits.

### Services

| Service | Start command | Notes |
| --- | --- | --- |
| Local Supabase (DB/Auth/Storage) | `supabase start` | Docker must be running first (see below). Prints URL + anon key via `supabase status`. |
| Vite dev server | `npm run dev -- --host 127.0.0.1 --port 5199 --strictPort` | Reads `.env.local`. Port 5199 matches the Playwright `baseURL`. |

### Docker daemon

Docker is installed but not managed by systemd in this VM. If `docker info` fails, start the
daemon in the background (e.g. `sudo dockerd` inside a tmux session) and make the socket
usable without sudo: `sudo chmod 666 /var/run/docker.sock`. The daemon is configured for
docker-in-docker with `storage-driver: fuse-overlayfs` and `containerd-snapshotter: false`
in `/etc/docker/daemon.json` (required for Docker 29 + fuse-overlayfs).

### Known gotcha: duplicate `096` migration version

`supabase/migrations/` contains two files that share the `096` version prefix
(`096_connection_unique_pair.sql` and `096_fix_is_admin.sql`). The current Supabase CLI
derives the migration version from the numeric prefix, so a fresh `supabase start` /
`supabase db reset` fails with a duplicate-key error when recording the second `096`
migration. Once the stack has been initialized (its Postgres volume persists across
`supabase stop`/`start`), a plain `supabase start` just restarts the existing containers and
does NOT re-run migrations, so it works normally.

If you ever need a clean re-initialization, temporarily move `096_fix_is_admin.sql` out of
`supabase/migrations/`, run `supabase start` (or `db reset`), then apply that one file
manually and move it back:

```
mv supabase/migrations/096_fix_is_admin.sql /tmp/
supabase start
cat /tmp/096_fix_is_admin.sql | docker exec -i supabase_db_booth-bridge psql -U postgres -d postgres
mv /tmp/096_fix_is_admin.sql supabase/migrations/
```

### Known gotcha: Data API roles need table GRANTs

The migrations enable RLS and define `anon`/`authenticated` policies but do not `GRANT`
table privileges — production relies on Supabase's legacy auto-exposure of the `public`
schema. The current CLI does NOT auto-grant (`auto_expose_new_tables` is unset in
`supabase/config.toml`), so a fresh local DB returns `permission denied for table user`
(Postgres `42501`) on login. After a fresh re-initialization, grant the Data API roles
(RLS still gates rows), matching production:

```
docker exec -i supabase_db_booth-bridge psql -U postgres -d postgres <<'SQL'
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
SQL
```

### Local environment variables

Local dev needs `.env.local` (gitignored) with the local Supabase URL + anon key from
`supabase status`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY from `supabase status`>
VITE_APP_URL=http://127.0.0.1:5199
```

Email/password signup works out of the box locally (`enable_confirmations = false` in
`supabase/config.toml`), so you can register and immediately log in without email
verification. Google OAuth and the AI/OCR Edge Functions require extra secrets
(Google client, OpenRouter, etc.) and are not needed for basic auth + profile flows.

### Testing

- Lint: `npm run lint`
- Build: `npm run build`
- E2E (Playwright): `npm run test:e2e -- --project=public`. Install browsers once with
  `npx playwright install --with-deps chromium`. The `public` project runs without login
  creds; the `exhibitor`/`buyer`/`admin` projects only run when their `E2E_*` creds are set.
