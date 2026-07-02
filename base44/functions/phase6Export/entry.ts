/**
 * ⛔ ARCHIVED — Data Migration Waiver (2026-07-01)
 * Do not deploy or execute. Export pipeline not required.
 * Preserved for historical reference. See docs/phase6-master-execution-plan.md
 *
 * Phase 6 — Base44 service-role export proxy.
 *
 * `asServiceRole` is only available inside Base44-hosted backend functions
 * (createClientFromRequest). This function exposes paginated read access for
 * the local export orchestrator in scripts/phase6/.
 *
 * Deploy: publish app on Base44 so this function is live.
 * Secret: set PHASE6_EXPORT_SECRET in Base44 workspace / function secrets.
 *
 * Infrastructure actions (no application data returned):
 *   ping   — auth + deployment health check
 *   probe  — service-role handler + pagination config for one entity
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.32";

const ENTITY_NAMES = [
  "Activity",
  "AdminAccessLog",
  "BillingSubscription",
  "BillingTransaction",
  "Booth",
  "BuyerProfile",
  "CatalogItem",
  "Company",
  "Connection",
  "Event",
  "ExhibitorProfile",
  "IntegrationConnection",
  "IntegrationSyncLog",
  "LeadIntelligence",
  "LeadInteraction",
  "LeadProfile",
  "MatchRecommendation",
  "Media",
  "Meeting",
  "MeetingRequest",
  "NFCInteraction",
  "NFCProductTag",
  "NFCProfile",
  "Notification",
  "OpportunityPost",
  "PremiumBoothSubscription",
  "Product",
  "ProjectSupplierMapping",
  "RFI",
  "SavedBooth",
  "SavedProduct",
  "ScannedContact",
  "SourcingProject",
  "SponsoredListing",
  "StressTestResult",
  "SupportTicket",
  "SystemAlert",
  "User",
  "VerificationProfile",
];

const MAX_LIMIT = 5000;
const DEFAULT_SORT = "-created_date";
const PROBE_ENTITY = "SystemAlert";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function getSecret(req: Request, body: Record<string, unknown>) {
  const header = req.headers.get("X-Phase6-Export-Secret");
  const fromBody = typeof body.secret === "string" ? body.secret : null;
  return header || fromBody;
}

function secretConfigured() {
  return Boolean(Deno.env.get("PHASE6_EXPORT_SECRET"));
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "ping") {
      return Response.json({
        ok: true,
        action: "ping",
        secretConfigured: secretConfigured(),
        entityRegistryCount: ENTITY_NAMES.length,
        maxPageSize: MAX_LIMIT,
        defaultSort: DEFAULT_SORT,
        serviceRolePath: "asServiceRole.entities",
      });
    }

    const expected = Deno.env.get("PHASE6_EXPORT_SECRET");
    const provided = getSecret(req, body);

    if (!expected || !provided || provided !== expected) {
      return unauthorized();
    }

    const base44 = createClientFromRequest(req);

    if (action === "probe") {
      const entity =
        typeof body.entity === "string" && ENTITY_NAMES.includes(body.entity)
          ? body.entity
          : PROBE_ENTITY;

      const handler = base44.asServiceRole.entities[entity];
      const hasList = typeof handler?.list === "function";

      if (!hasList) {
        return badRequest(`Service-role entity handler not available: ${entity}`);
      }

      const skip = Math.max(0, Number(body.skip) || 0);
      const limit = Math.min(
        Math.max(1, Number(body.limit) || MAX_LIMIT),
        MAX_LIMIT
      );

      return Response.json({
        ok: true,
        action: "probe",
        entity,
        serviceRoleAccess: true,
        handlerPresent: true,
        listMethodPresent: true,
        pagination: {
          initialized: true,
          skip,
          limit,
          maxPageSize: MAX_LIMIT,
          sort: typeof body.sort === "string" ? body.sort : DEFAULT_SORT,
          dataFetched: false,
        },
        entityRegistryCount: ENTITY_NAMES.length,
      });
    }

    const { entity, skip = 0, limit = MAX_LIMIT, sampleSize = 10, sort = DEFAULT_SORT } =
      body;

    if (!entity || typeof entity !== "string") {
      return badRequest("Missing entity name");
    }

    if (!ENTITY_NAMES.includes(entity)) {
      return badRequest(`Unknown entity: ${entity}`);
    }

    const safeLimit = Math.min(Math.max(1, Number(limit) || MAX_LIMIT), MAX_LIMIT);
    const safeSkip = Math.max(0, Number(skip) || 0);
    const safeSample = Math.min(Math.max(1, Number(sampleSize) || 10), MAX_LIMIT);

    const handler = base44.asServiceRole.entities[entity];

    if (!handler?.list) {
      return badRequest(`Entity handler not found: ${entity}`);
    }

    if (action === "sample") {
      const rows = await handler.list(sort, safeSample, 0);
      return Response.json({
        action: "sample",
        entity,
        sampleSize: safeSample,
        count: rows.length,
        rows,
      });
    }

    if (action === "page") {
      const rows = await handler.list(sort, safeLimit, safeSkip);
      return Response.json({
        action: "page",
        entity,
        skip: safeSkip,
        limit: safeLimit,
        count: rows.length,
        rows,
      });
    }

    return badRequest(`Invalid action: ${action}. Use ping, probe, sample, or page.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
