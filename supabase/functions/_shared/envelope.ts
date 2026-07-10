export type AiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type EdgeError = {
  code: string;
  message: string;
  retryable?: boolean;
  details?: unknown;
};

export type EdgeEnvelope<T = unknown> = {
  success: boolean;
  result: T | null;
  error: EdgeError | null;
  provider: string | null;
  model: string | null;
  latency: number;
  usage: AiUsage | null;
  metadata: Record<string, unknown>;
};

export function successEnvelope<T>(
  params: {
    result: T;
    provider?: string | null;
    model?: string | null;
    latency?: number;
    usage?: AiUsage | null;
    metadata?: Record<string, unknown>;
  },
): EdgeEnvelope<T> {
  return {
    success: true,
    result: params.result,
    error: null,
    provider: params.provider ?? null,
    model: params.model ?? null,
    latency: params.latency ?? 0,
    usage: params.usage ?? null,
    metadata: params.metadata ?? {},
  };
}

export function errorEnvelope(
  message: string,
  params: {
    code?: string;
    stage?: string;
    provider?: string | null;
    model?: string | null;
    latency?: number;
    retryable?: boolean;
    details?: unknown;
    metadata?: Record<string, unknown>;
    providerResponse?: unknown;
    openRouterResponseBody?: unknown;
  } = {},
): EdgeEnvelope<null> & {
  stage: string;
  code: string;
  message: string;
  details: unknown;
  providerResponse?: unknown;
  openRouterResponseBody?: unknown;
} {
  const code = params.code ?? "EDGE_FUNCTION_ERROR";
  const stage = params.stage ?? "edge_function";
  const details = params.details ?? null;

  return {
    success: false,
    stage,
    code,
    message,
    details,
    providerResponse: params.providerResponse,
    openRouterResponseBody: params.openRouterResponseBody,
    result: null,
    error: {
      code,
      message,
      retryable: params.retryable ?? false,
      details,
    },
    provider: params.provider ?? null,
    model: params.model ?? null,
    latency: params.latency ?? 0,
    usage: null,
    metadata: params.metadata ?? {},
  };
}
