# Phase 6 — Base44 Export Tooling (6C.2)

> **⛔ ARCHIVED — Data Migration Waiver (2026-07-01)**  
> The Base44 database contains only demonstration/test data. No production records require preservation.  
> **Do not execute** export, UUID verification, manifest generation, Gates 1–3, or import.  
> Preserved for historical reference. Active roadmap: [`docs/phase7-complete-supabase-transition.md`](../../docs/phase7-complete-supabase-transition.md)

Read-only verification and export utilities for migrating Base44 entity data to Supabase.
**Canonical execution plan:** [`docs/phase6-master-execution-plan.md`](../../docs/phase6-master-execution-plan.md)

**Nothing in this folder connects to Supabase or imports data.** Export scripts call Base44 only when explicitly run (Gates 1+).

---

## SDK configuration & safest export method

### How this app configures Base44 today

| Setting | Source | BoothBridge value |
|---------|--------|-------------------|
| App ID | `BASE44_APP_ID` / `VITE_BASE44_APP_ID` / `base44/.app.jsonc` | `6a1efdb97246f738e8422e59` |
| App base URL | `BASE44_APP_BASE_URL` / `VITE_BASE44_APP_BASE_URL` | From `.env.local` |
| Functions version | `BASE44_FUNCTIONS_VERSION` / `VITE_BASE44_FUNCTIONS_VERSION` | Optional |
| Client | `src/api/base44Client.js` | `createClient({ appId, token, ... })` |

### Service role constraint (critical)

Per [Base44 client docs](https://docs.base44.com/developers/references/sdk/getting-started/client):

> **Service role authentication is only available in Base44-hosted backend functions.** External backends can't use service role permissions.

`base44.asServiceRole.entities.*` **cannot** be called from a local Node `createClient()` script. It only works inside Deno functions via `createClientFromRequest(req)`.

### Safest export method

| Approach | Verdict |
|----------|---------|
| **`phase6Export` function + local orchestrator** | **Recommended** — full RLS bypass, all 39 entities, paginated |
| Dashboard CSV per entity | Not recommended — manual, loses nested JSON |
| `createClient()` + admin login only | **Incomplete** — `User` entity restricts non–service-role reads to self |
| Direct REST | Same limitations as non–service-role SDK |

**Architecture:**

```
Local Node script  →  functions.invoke("phase6Export")  →  asServiceRole.entities.{Entity}.list()
```

Backend function: `base44/functions/phase6Export/entry.ts`

### phase6Export actions

| Action | Secret | Reads rows? |
|--------|--------|-------------|
| `ping` | No | No |
| `probe` | Yes | No |
| `sample` | Yes | Yes (limited) |
| `page` | Yes | Yes (paginated) |

---

## Prerequisites (Gates 1+)

1. **Deploy** the app on Base44 so `phase6Export` is published.
2. **Set secret** `PHASE6_EXPORT_SECRET` in Base44 workspace/function secrets.
3. **Local env** (create `.env.phase6.local` — do not commit):

```bash
BASE44_APP_ID=6a1efdb97246f738e8422e59
BASE44_APP_BASE_URL=https://<your-app>.base44.app
# BASE44_FUNCTIONS_VERSION=

PHASE6_EXPORT_SECRET=<same-as-base44-workspace-secret>

# Auth to invoke functions (pick one):
BASE44_EXPORT_EMAIL=<any-valid-base44-user@email>
BASE44_EXPORT_PASSWORD=<password>
# OR
BASE44_ACCESS_TOKEN=<jwt-from-browser-session>
```

4. `npm install` (uses existing `@base44/sdk` dependency).

Optional throttle:

```bash
PHASE6_REQUEST_DELAY_MS=200   # pause between paginated requests
```

---

## Export output layout (6C.4 only)

```
exports/phase6/
  User.json
  Event.json
  ...
  manifest.json
```

UUID verification (**6C.3B**) does **not** write files under `exports/phase6/`.

### `manifest.json` schema

```json
{
  "exportTimestamp": "2026-07-01T12:00:00.000Z",
  "entities": [
    {
      "entity": "User",
      "exportedRows": 123,
      "exportTimestamp": "2026-07-01T12:00:00.000Z"
    }
  ]
}
```

### Export behaviour (6C.4)

- Exports **all 39** entities in `ENTITY_TABLE_MAP`
- Page size **5000** (Base44 SDK maximum)
- Paginates with `skip` until a page returns fewer than 5000 rows
- Default sort **`-created_date`**
- Writes **exact API records** via `JSON.stringify` (preserves `null`, nested objects, arrays)

---

## Execution order

| Step | Gate | Sub-phase | Command | API calls |
|------|------|-----------|---------|-----------|
| 0 | — | — | `npm run phase6:dry-run` | None |
| 1 | 1 | 6C.3A | `npm run phase6:verify-infra` | Function invoke; **no entity rows** |
| 2 | 2 | 6C.3B | `npm run phase6:verify-uuid` | Function invoke; stratified sample |
| 3 | 3 | 6C.4 | `npm run phase6:export` | Full paginated read |
| 4 | 4 | 6C.5 | Review `manifest.json` | None |
| 5 | 5 | 6D | Import (not implemented) | — |

**Await explicit approval before Gates 2–4.**

### Gate 1 — Infrastructure verification (6C.3A)

```bash
npm run phase6:verify-infra
```

Confirms `phase6Export` is deployed, secret auth works, service-role handlers exist for all 39 entities, and pagination initializes **without fetching entity rows**.

Report: `docs/phase6-infrastructure-verification-report.md`

### Gate 2 — UUID verification (6C.3B)

```bash
npm run phase6:verify-uuid
```

**Per entity (max 20 rows after dedupe by `id`):**

- 5 earliest (`+created_date`)
- 5 latest (`-created_date`)
- 10 random (uniform index into ASC-ordered population)

**Output: console only** — no JSON files, no report overwrite.

Constants: `UUID_SAMPLE_*` in `lib/entity-registry.mjs`.  
Manual template: `docs/phase6-uuid-compatibility-report.md`.

### Gate 3 — Full export (6C.4)

```bash
npm run phase6:export
```

Only after Gate 2 approval.

### Gate 4 — Manifest (6C.5)

```bash
npm run phase6:manifest   # optional — regenerate from existing JSON on disk
```

---

## npm scripts

```bash
npm run phase6:dry-run
npm run phase6:verify-infra
npm run phase6:verify-uuid
npm run phase6:export
npm run phase6:manifest
```

---

## File reference

| File | Purpose |
|------|---------|
| `base44/functions/phase6Export/entry.ts` | Service-role paginated read API (`ping`, `probe`, `sample`, `page`) |
| `export-entities.mjs` | Full export orchestrator (6C.4) |
| `verify-infrastructure.mjs` | Infrastructure verification (6C.3A / Gate 1) |
| `verify-uuid-sample.mjs` | Stratified UUID sample (6C.3B / Gate 2); console only |
| `generate-manifest.mjs` | Manifest builder |
| `dry-run-estimate.mjs` | Row/size/time heuristics (no API) |
| `lib/entity-registry.mjs` | `ENTITY_TABLE_MAP`, sampling constants |
| `lib/paginated-export.mjs` | `page` / `sample` invoke helpers |
| `lib/uuid-sampling.mjs` | Stratified sample fetch |
| `lib/uuid-analysis.mjs` | UUID regex + classification |
| `lib/base44-client.mjs` | SDK client + auth |
| `lib/resolve-app-id.mjs` | App ID from env or `.app.jsonc` |
| `lib/json-writer.mjs` | Export JSON serialization |

---

## Security

- **Never commit** `exports/phase6/*.json` (production PII).
- **Never commit** `PHASE6_EXPORT_SECRET` or tokens.
- Rotate `PHASE6_EXPORT_SECRET` after migration.
- Delete or disable `phase6Export` after cutover.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Unauthorized` from phase6Export | `PHASE6_EXPORT_SECRET` mismatch between local env and Base44 |
| `Unknown entity` | Entity name must match PascalCase in `ENTITY_TABLE_MAP` exactly |
| Function not found | Publish app on Base44; confirm function name `phase6Export` |
| Empty UUID sample lines | Entity may have zero rows, or function not deployed |
| 429 / rate limit | Increase `PHASE6_REQUEST_DELAY_MS` to 500–1000 |

---

## What this folder does NOT do

- Does not import into Supabase (6D — not implemented)
- Does not modify React, dbClient, wrappers, or migrations
- Does not run automatically — **await explicit approval per gate**
