# Phase 8.5 — Repository Cleanup & Release Candidate

**Gate:** Required **before** any production deployment (preview deploys may proceed under Phase 7.8 checklist).  
**Tag target:** `v1.0.0-rc1`  
**Branch:** `migration/base44-independence` (or release branch cut from it)

---

## Purpose

Freeze a clean, reproducible codebase snapshot immediately before production launch. No new features, schema changes, or runtime behavior changes — repository hygiene and release tagging only.

---

## Scope

| Task | Examples |
|------|----------|
| Remove obsolete migration artifacts | `scripts/phase7-4f/.deploy-result-*.json`, stale MCP deploy payloads, one-off generated bundles if superseded by CLI deploy |
| Prune stale generated helpers | Temporary extraction scripts, duplicate deploy snapshots, `dist-supabase-check/` if present |
| Archive or trim stale reports | Superseded phase reports that reference non-canonical projects or pre-RC3 runtime defaults (keep audit trail in git history; remove only clearly obsolete working copies) |
| Verify reproducibility | `npm ci && npm run build` (supabase default + base44 rollback) from clean tree |
| Repository cleanliness | `git status` clean; no secrets, `.env*`, or `exports/phase6/**/*.json` tracked |
| Tag release candidate | `git tag -a v1.0.0-rc1 -m "BoothBridge Supabase RC1 — pre-production freeze"` |

---

## Out of scope

- Production deploy (Phase 8)
- Base44 dependency removal (Phase 8B / post-cutover cleanup)
- Database migrations or Edge Function changes
- UI or business-logic changes

---

## Exit criteria

- [ ] Working tree clean after cleanup commit
- [ ] `npm run build` passes (`VITE_DATA_BACKEND` default and `base44` rollback)
- [ ] `supabase db push --linked --dry-run` reports up to date
- [ ] No tracked secrets or migration export PII
- [ ] Tag `v1.0.0-rc1` created and pushed
- [ ] Checkpoint documents current commit SHA

---

## Then proceed to

**Phase 8 — Production Launch & Stabilization** using `docs/phase7-8-production-checklist.md`, deploying from the `v1.0.0-rc1` tag (or commit it points to).

---

## Restore from RC1

```bash
git checkout v1.0.0-rc1
npm ci && npm run build
```

```bash
git push origin v1.0.0-rc1   # manual, after tag created locally
```
