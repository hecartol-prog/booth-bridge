import type { AiUsage } from "./envelope.ts";

export type AiGatewayName = "openrouter" | "openai";
export type AiProviderName =
  | "deepseek"
  | "qwen"
  | "zhipu"
  | "moonshot"
  | "openai"
  | "claude"
  | "gemini";

export type CompletionRequest = {
  prompt?: string;
  messages?: Array<{ role: string; content: unknown }>;
  file_url?: string;
  file_urls?: string[];
  json_schema?: Record<string, unknown>;
  response_json_schema?: Record<string, unknown>;
  stream?: boolean;
  model?: string;
};

export type GatewayAttempt = {
  provider: AiProviderName;
  gateway: AiGatewayName;
  model: string;
  ok: boolean;
  latency: number;
  retryable?: boolean;
  status?: number;
  message?: string;
};

export type CompletionResult = {
  text: string;
  parsed: unknown;
  model: string;
  provider: AiProviderName;
  gateway: AiGatewayName;
  usage: AiUsage | null;
  attempts: GatewayAttempt[];
  fallbackProvider: AiProviderName | null;
};

export type ProviderHealth = {
  provider: AiProviderName;
  gateway: AiGatewayName;
  model: string;
  ok: boolean;
  latency: number;
  message?: string;
  status?: number;
};

type GatewayRoute = {
  provider: AiProviderName;
  gateway: AiGatewayName;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

type GatewayPlan = {
  selectedProvider: AiProviderName | null;
  activeModel: string | null;
  fallbackProvider: AiProviderName | null;
  routes: GatewayRoute[];
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const GATEWAY_VERSION = Deno.env.get("AI_GATEWAY_VERSION") || "phase7.7a";
const MAX_REQUEST_TIMEOUT_MS = 5000;
const MIN_REQUEST_TIMEOUT_MS = 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const DEFAULT_OPENROUTER_PROVIDER_ORDER: AiProviderName[] = [
  "deepseek",
  "qwen",
  "zhipu",
  "moonshot",
  "openai",
  "claude",
  "gemini",
];

function resolveRequestTimeoutMs(): number {
  const raw = Number(Deno.env.get("AI_REQUEST_TIMEOUT_MS") || DEFAULT_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(raw)) return DEFAULT_REQUEST_TIMEOUT_MS;
  return Math.min(
    MAX_REQUEST_TIMEOUT_MS,
    Math.max(MIN_REQUEST_TIMEOUT_MS, Math.round(raw)),
  );
}

const REQUEST_TIMEOUT_MS = resolveRequestTimeoutMs();

const DEFAULT_MODELS: Record<AiProviderName, string> = {
  deepseek: "deepseek/deepseek-chat",
  qwen: "qwen/qwen-2.5-72b-instruct",
  zhipu: "zhipuai/glm-4-plus",
  moonshot: "moonshotai/kimi-k2",
  openai: "openai/gpt-4o-mini",
  claude: "anthropic/claude-3.5-sonnet",
  gemini: "google/gemini-2.0-flash-001",
};

function parseProviderOrder(raw: string | null): AiProviderName[] {
  if (!raw) return DEFAULT_OPENROUTER_PROVIDER_ORDER;

  const order: AiProviderName[] = [];
  const seen = new Set<AiProviderName>();
  for (const token of raw.split(",")) {
    const provider = token.trim().toLowerCase() as AiProviderName;
    if (!DEFAULT_OPENROUTER_PROVIDER_ORDER.includes(provider) || seen.has(provider)) continue;
    seen.add(provider);
    order.push(provider);
  }

  return order.length > 0 ? order : DEFAULT_OPENROUTER_PROVIDER_ORDER;
}

function getOpenRouterProviderOrder(): AiProviderName[] {
  return parseProviderOrder(Deno.env.get("AI_PROVIDER_ORDER"));
}

function isDirectOpenAiFallbackEnabled(): boolean {
  return (Deno.env.get("AI_ENABLE_DIRECT_OPENAI_FALLBACK") || "true").toLowerCase() !== "false";
}

const MAX_RETRY_BACKOFF_MS = 2000;
const BASE_RETRY_BACKOFF_MS = 250;

function retryBackoffMs(attemptIndex: number): number {
  return Math.min(MAX_RETRY_BACKOFF_MS, BASE_RETRY_BACKOFF_MS * (2 ** attemptIndex));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStructured(level: "warn" | "error", event: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({
    ts: new Date().toISOString(),
    scope: "ai_gateway",
    event,
    ...payload,
  });
  if (level === "warn") {
    console.warn(body);
    return;
  }
  console.error(body);
}

function envModel(provider: AiProviderName, requestedModel?: string): string {
  const providerKey = `AI_MODEL_${provider.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const value = Deno.env.get(providerKey);

  if (provider === "deepseek") {
    return requestedModel || value || Deno.env.get("AI_MODEL") || DEFAULT_MODELS.deepseek;
  }

  return value || DEFAULT_MODELS[provider];
}

function createRoute(
  provider: AiProviderName,
  gateway: AiGatewayName,
  model: string,
): GatewayRoute {
  if (gateway === "openrouter") {
    return {
      provider,
      gateway,
      model,
      apiKey: Deno.env.get("OPENROUTER_API_KEY"),
      baseUrl: OPENROUTER_BASE_URL,
      extraHeaders: {
        "HTTP-Referer": Deno.env.get("OPENROUTER_HTTP_REFERER") || "https://boothbridge.app",
        "X-Title": Deno.env.get("OPENROUTER_APP_NAME") || "BoothBridge",
      },
    };
  }

  return {
    provider,
    gateway,
    model,
    apiKey: Deno.env.get("OPENAI_API_KEY"),
    baseUrl: OPENAI_BASE_URL,
  };
}

function buildGatewayPlan(requestedModel?: string): GatewayPlan {
  const requestedGateway = (Deno.env.get("AI_PROVIDER") || "openrouter").toLowerCase();

  if (requestedGateway === "openai") {
    const openAiModel = requestedModel || Deno.env.get("AI_MODEL") || "gpt-4o-mini";
    const routes = [createRoute("openai", "openai", openAiModel)];
    return {
      selectedProvider: routes[0].apiKey ? routes[0].provider : null,
      activeModel: routes[0].apiKey ? routes[0].model : null,
      fallbackProvider: null,
      routes,
    };
  }

  const openRouterOrder = getOpenRouterProviderOrder();
  const routes: GatewayRoute[] = openRouterOrder.map((provider, index) =>
    createRoute(provider, "openrouter", envModel(provider, index === 0 ? requestedModel : undefined))
  );

  // Legacy direct OpenAI compatibility remains available after the OpenRouter chain.
  if (isDirectOpenAiFallbackEnabled()) {
    const directOpenAiModel = Deno.env.get("AI_MODEL_OPENAI_DIRECT") || "gpt-4o-mini";
    routes.push(createRoute("openai", "openai", directOpenAiModel));
  }

  const enabledRoutes = routes.filter((route) => Boolean(route.apiKey));

  return {
    selectedProvider: enabledRoutes[0]?.provider ?? null,
    activeModel: enabledRoutes[0]?.model ?? null,
    fallbackProvider: enabledRoutes[1]?.provider ?? null,
    routes,
  };
}

function schemaFromRequest(req: CompletionRequest): Record<string, unknown> | null {
  return (req.response_json_schema || req.json_schema || null) as Record<string, unknown> | null;
}

function buildUserContent(req: CompletionRequest): unknown {
  const urls = [
    ...(req.file_urls ?? []),
    ...(req.file_url ? [req.file_url] : []),
  ];

  const parts: Array<Record<string, unknown>> = [];
  if (req.prompt) parts.push({ type: "text", text: req.prompt });

  for (const url of urls) {
    parts.push({ type: "image_url", image_url: { url } });
  }

  if (parts.length === 0) return req.prompt ?? "";
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts;
}

function buildMessages(req: CompletionRequest): Array<{ role: string; content: unknown }> {
  if (req.messages?.length) return req.messages;
  return [{ role: "user", content: buildUserContent(req) }];
}

function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
}

function extractAssistantText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function normalizeUsage(usage: unknown): AiUsage | null {
  if (!usage || typeof usage !== "object") return null;

  const payload = usage as Record<string, unknown>;
  return {
    prompt_tokens: Number(payload.prompt_tokens || 0) || undefined,
    completion_tokens: Number(payload.completion_tokens || 0) || undefined,
    total_tokens: Number(payload.total_tokens || 0) || undefined,
  };
}

function createGatewayError(
  message: string,
  route: GatewayRoute,
  params: {
    code: string;
    retryable: boolean;
    status?: number;
    attempts?: GatewayAttempt[];
  },
): Error {
  const error = new Error(message) as Error & {
    code?: string;
    retryable?: boolean;
    status?: number;
    provider?: AiProviderName;
    gateway?: AiGatewayName;
    model?: string;
    attempts?: GatewayAttempt[];
  };
  error.code = params.code;
  error.retryable = params.retryable;
  error.status = params.status;
  error.provider = route.provider;
  error.gateway = route.gateway;
  error.model = route.model;
  error.attempts = params.attempts;
  return error;
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.message.toLowerCase().includes("abort");
}

async function readErrorText(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return response.statusText || "Unknown provider error";

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const message = parsed?.error && typeof parsed.error === "object"
      ? String((parsed.error as Record<string, unknown>).message || text)
      : String(parsed.message || text);
    return message;
  } catch {
    return text;
  }
}

function isRetryableResponse(status: number, message: string): boolean {
  const lower = message.toLowerCase();
  return status === 429 ||
    status >= 500 ||
    lower.includes("provider unavailable") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("timeout") ||
    lower.includes("timed out");
}

async function callChatCompletions(
  route: GatewayRoute,
  req: CompletionRequest,
): Promise<Omit<CompletionResult, "attempts" | "fallbackProvider">> {
  if (!route.apiKey) {
    throw createGatewayError(
      `${route.gateway.toUpperCase()} credentials are not configured.`,
      route,
      { code: "AI_AUTHENTICATION", retryable: false },
    );
  }

  const schema = schemaFromRequest(req);
  const messages = buildMessages(req).map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const body: Record<string, unknown> = {
    model: route.model,
    messages,
    temperature: 0.2,
  };

  if (schema) {
    body.response_format = { type: "json_object" };
    const systemIdx = messages.findIndex((message) => message.role === "system");
    const schemaHint = `Respond with valid JSON matching this schema: ${JSON.stringify(schema)}`;
    if (systemIdx >= 0 && typeof messages[systemIdx].content === "string") {
      messages[systemIdx].content = `${messages[systemIdx].content}\n\n${schemaHint}`;
    } else {
      messages.unshift({ role: "system", content: schemaHint });
    }
    body.messages = messages;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${route.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${route.apiKey}`,
        "Content-Type": "application/json",
        ...(route.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await readErrorText(response);
      const retryable = isRetryableResponse(response.status, detail);
      const code = response.status === 429
        ? "AI_RATE_LIMIT"
        : response.status === 401 || response.status === 403
        ? "AI_AUTHENTICATION"
        : retryable
        ? "AI_PROVIDER_UNAVAILABLE"
        : "AI_PROVIDER_ERROR";

      throw createGatewayError(
        `${route.provider} via ${route.gateway} failed (${response.status}): ${detail}`,
        route,
        { code, retryable, status: response.status },
      );
    }

    const payload = await response.json();
    const text = extractAssistantText(payload?.choices?.[0]?.message?.content ?? "");

    return {
      text,
      parsed: schema ? parseJsonText(text) : text,
      model: payload?.model || route.model,
      provider: route.provider,
      gateway: route.gateway,
      usage: normalizeUsage(payload?.usage),
    };
  } catch (error) {
    if ((error as Error & { code?: string }).code) throw error;

    if (timedOut || isAbortError(error)) {
      throw createGatewayError(
        `${route.provider} via ${route.gateway} timed out after ${REQUEST_TIMEOUT_MS}ms.`,
        route,
        { code: "AI_TIMEOUT", retryable: true, status: 504 },
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw createGatewayError(
      `${route.provider} via ${route.gateway} is unavailable: ${message}`,
      route,
      { code: "AI_PROVIDER_UNAVAILABLE", retryable: true, status: 503 },
    );
  } finally {
    clearTimeout(timer);
  }
}

function noGatewayConfiguredError(): Error {
  const route = createRoute("openai", "openai", "gpt-4o-mini");
  return createGatewayError(
    "No AI gateway credentials configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.",
    route,
    { code: "AI_AUTHENTICATION", retryable: false },
  );
}

function attemptFromError(route: GatewayRoute, latency: number, error: unknown): GatewayAttempt {
  const message = error instanceof Error ? error.message : String(error);
  return {
    provider: route.provider,
    gateway: route.gateway,
    model: route.model,
    ok: false,
    latency,
    retryable: Boolean((error as Error & { retryable?: boolean }).retryable),
    status: (error as Error & { status?: number }).status,
    message,
  };
}

function successAttempt(route: GatewayRoute, latency: number): GatewayAttempt {
  return {
    provider: route.provider,
    gateway: route.gateway,
    model: route.model,
    ok: true,
    latency,
  };
}

export async function complete(req: CompletionRequest): Promise<CompletionResult> {
  const plan = buildGatewayPlan(req.model);
  const routes = plan.routes.filter((route) => Boolean(route.apiKey));

  if (routes.length === 0) {
    throw noGatewayConfiguredError();
  }

  const attempts: GatewayAttempt[] = [];

  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    const started = Date.now();

    try {
      const completion = await callChatCompletions(route, req);
      attempts.push(successAttempt(route, Date.now() - started));

      return {
        ...completion,
        attempts,
        fallbackProvider: routes[index + 1]?.provider ?? null,
      };
    } catch (error) {
      const attempt = attemptFromError(route, Date.now() - started, error);
      attempts.push(attempt);

      const retryable = Boolean((error as Error & { retryable?: boolean }).retryable);
      logStructured(
        !retryable || index === routes.length - 1 ? "error" : "warn",
        "provider_attempt_failed",
        {
          provider: route.provider,
          gateway: route.gateway,
          model: route.model,
          status: attempt.status ?? null,
          retryable,
          latency_ms: attempt.latency,
          attempt_number: index + 1,
          remaining_routes: routes.length - index - 1,
          code: (error as Error & { code?: string }).code || "AI_PROVIDER_ERROR",
        },
      );
      if (!retryable || index === routes.length - 1) {
        const message = error instanceof Error ? error.message : String(error);
        throw createGatewayError(message, route, {
          code: (error as Error & { code?: string }).code || "AI_PROVIDER_ERROR",
          retryable,
          status: (error as Error & { status?: number }).status,
          attempts,
        });
      }

      const delayMs = retryBackoffMs(index);
      logStructured("warn", "provider_retry_backoff", {
        provider: route.provider,
        gateway: route.gateway,
        delay_ms: delayMs,
        attempt_number: index + 1,
      });
      await sleep(delayMs);
    }
  }

  throw noGatewayConfiguredError();
}

async function probeGateway(route: GatewayRoute): Promise<{
  ok: boolean;
  latency: number;
  status?: number;
  message?: string;
  models: Set<string>;
}> {
  if (!route.apiKey) {
    return {
      ok: false,
      latency: 0,
      message: `${route.gateway.toUpperCase()} credentials are not configured.`,
      models: new Set<string>(),
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const started = Date.now();

  try {
    const response = await fetch(`${route.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${route.apiKey}`,
        ...(route.extraHeaders ?? {}),
      },
      signal: controller.signal,
    });

    const latency = Date.now() - started;
    if (!response.ok) {
      return {
        ok: false,
        latency,
        status: response.status,
        message: await readErrorText(response),
        models: new Set<string>(),
      };
    }

    const payload = await response.json().catch(() => ({}));
    const catalog = Array.isArray(payload?.data)
      ? new Set<string>(
        payload.data
          .map((item: unknown) =>
            item && typeof item === "object" && "id" in item ? String((item as { id: unknown }).id) : null
          )
          .filter((item: string | null): item is string => Boolean(item)),
      )
      : new Set<string>();

    return {
      ok: true,
      latency,
      status: response.status,
      message: "reachable",
      models: catalog,
    };
  } catch (error) {
    return {
      ok: false,
      latency: Date.now() - started,
      status: timedOut ? 504 : 503,
      message: timedOut
        ? `Timed out after ${REQUEST_TIMEOUT_MS}ms.`
        : error instanceof Error
        ? error.message
        : String(error),
      models: new Set<string>(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeProvider(): Promise<{
  ok: boolean;
  provider: AiProviderName | null;
  model: string | null;
  gateway: AiGatewayName | null;
  selectedProvider: AiProviderName | null;
  activeModel: string | null;
  fallbackProvider: AiProviderName | null;
  providers: ProviderHealth[];
}> {
  const plan = buildGatewayPlan();
  const uniqueRoutes = new Map<string, GatewayRoute>();

  for (const route of plan.routes) {
    const key = `${route.gateway}:${route.apiKey || "missing"}`;
    if (!uniqueRoutes.has(key)) uniqueRoutes.set(key, route);
  }

  const gatewayChecks = new Map<string, Awaited<ReturnType<typeof probeGateway>>>();
  await Promise.all(
    Array.from(uniqueRoutes.entries()).map(async ([key, route]) => {
      gatewayChecks.set(key, await probeGateway(route));
    }),
  );

  const providers = plan.routes.map((route) => {
    const key = `${route.gateway}:${route.apiKey || "missing"}`;
    const check = gatewayChecks.get(key)!;
    const modelAvailable = check.models.size === 0 || check.models.has(route.model);
    const ok = check.ok && modelAvailable;

    return {
      provider: route.provider,
      gateway: route.gateway,
      model: route.model,
      ok,
      latency: check.latency,
      status: check.status,
      message: ok
        ? "reachable"
        : check.ok
        ? `Model ${route.model} not listed by ${route.gateway}.`
        : check.message,
    };
  });

  return {
    ok: providers.some((entry) => entry.ok),
    provider: plan.selectedProvider,
    model: plan.activeModel,
    gateway: plan.selectedProvider
      ? plan.routes.find((route) => route.provider === plan.selectedProvider && Boolean(route.apiKey))?.gateway ?? null
      : null,
    selectedProvider: plan.selectedProvider,
    activeModel: plan.activeModel,
    fallbackProvider: plan.fallbackProvider,
    providers,
  };
}

export function getActiveProviderName(): AiProviderName | null {
  return buildGatewayPlan().selectedProvider;
}

export function getActiveGatewayName(): AiGatewayName | null {
  const plan = buildGatewayPlan();
  return plan.routes.find((route) => route.provider === plan.selectedProvider && Boolean(route.apiKey))?.gateway ?? null;
}

export function getFallbackProviderName(): AiProviderName | null {
  return buildGatewayPlan().fallbackProvider;
}

export function getDefaultModel(): string | null {
  return buildGatewayPlan().activeModel;
}

export function getGatewayVersion(): string {
  return GATEWAY_VERSION;
}

export function getRequestTimeoutMs(): number {
  return REQUEST_TIMEOUT_MS;
}

export function getRoutingPlan(): Array<{
  provider: AiProviderName;
  gateway: AiGatewayName;
  model: string;
  enabled: boolean;
  timeoutMs: number;
}> {
  return buildGatewayPlan().routes.map((route) => ({
    provider: route.provider,
    gateway: route.gateway,
    model: route.model,
    enabled: Boolean(route.apiKey),
    timeoutMs: REQUEST_TIMEOUT_MS,
  }));
}
