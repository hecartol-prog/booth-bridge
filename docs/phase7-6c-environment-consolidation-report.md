# BoothBridge Phase 7.6C Environment Consolidation Report

**Generated:** 2026-07-04  
**Repository:** `booth-bridge`  
**Canonical Supabase project:** `jjqhmvfzqpohvukoxeoe`  
**Scope:** environment consolidation and operator-target standardization

## Executive Summary

The BoothBridge repository is standardized on a single Supabase project:

- `jjqhmvfzqpohvukoxeoe`

This project is the only approved target for local linking, deployment helpers, validation tooling, rollout checklists, and operator documentation.

## Consolidation Outcome

The repository now treats the following as canonical:

| Area | Canonical value |
| --- | --- |
| Supabase project ref | `jjqhmvfzqpohvukoxeoe` |
| Supabase API URL | `https://jjqhmvfzqpohvukoxeoe.supabase.co` |
| Local CLI link artifacts | `supabase/.temp/linked-project.json`, `supabase/.temp/project-ref` |
| Active deploy helper | `scripts/phase7-4f/deploy-all-functions.mjs` |
| Active validation tooling | `scripts/phase7-6-e2e-validation.mjs` |
| Current rollout and readiness docs | Phase 7.4F, 7.5B, 7.6B, 7.7, and remediation documentation |

## Repository Checks

The consolidation review verified:

- tracked frontend code only references `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- service-role credentials remain confined to server-side Supabase function code and operator documentation
- deployment helpers and current rollout notes point to the canonical Supabase project
- stale generated deployment output tied to non-canonical targets has been removed

## Operator Guidance

Use only the canonical project for all Supabase actions:

```bash
supabase link --project-ref jjqhmvfzqpohvukoxeoe
supabase functions deploy <function-name> --project-ref jjqhmvfzqpohvukoxeoe
```

When validating application behavior, secrets, storage, auth, or edge functions, assume `jjqhmvfzqpohvukoxeoe` is the single source of truth.

## Remaining Notes

- Historical audit evidence was superseded by this consolidation outcome and should not be used for future operator decisions.
- If any external dashboard bookmark, CI secret, or team vault entry still points elsewhere, update it to the canonical project before cutover.

## Final Assessment

Environment consolidation is complete at the repository level.

The remaining production-readiness work is operational hardening, not project-target selection.
