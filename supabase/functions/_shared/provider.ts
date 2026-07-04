import type { AiUsage } from "./envelope.ts";

export type AiProviderName = "openai" | "openrouter";

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

export type CompletionResult = {
  text: string;
  parsed: unknown;
  model: string;
  provider: AiProviderName;
  usage: AiUsage | null;
};

type ProviderConfig = {
  name: AiProviderName;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
};

function resolveProvider(): ProviderConfig {
  const requested = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();

  if (requested === "openrouter") {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
    return {
      name: "openrouter",
      apiKey,
      baseUrl: "https://openrouter.ai/api/v1",
      defaultModel: Deno.env.get("AI_MODEL") || "openai/gpt-4o",
    };
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return {
    name: "openai",
    apiKey,
    baseUrl: "https://api.openai.com/v1",
    defaultModel: Deno.env.get("AI_MODEL") || "gpt-4o",
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

async function callChatCompletions(
  config: ProviderConfig,
  req: CompletionRequest,
): Promise<CompletionResult> {
  const schema = schemaFromRequest(req);
  const model = req.model || config.defaultModel;
  const messages = buildMessages(req).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
  };

  if (schema) {
    body.response_format = { type: "json_object" };
    const systemIdx = messages.findIndex((m) => m.role === "system");
    const schemaHint =
      `Respond with valid JSON matching this schema: ${JSON.stringify(schema)}`;
    if (systemIdx >= 0 && typeof messages[systemIdx].content === "string") {
      messages[systemIdx].content = `${messages[systemIdx].content}\n\n${schemaHint}`;
    } else {
      messages.unshift({ role: "system", content: schemaHint });
    }
    body.messages = messages;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.name === "openrouter") {
    headers["HTTP-Referer"] = Deno.env.get("OPENROUTER_HTTP_REFERER") || "https://boothbridge.app";
    headers["X-Title"] = Deno.env.get("OPENROUTER_APP_NAME") || "BoothBridge";
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    const err = new Error(`Provider ${config.name} error (${response.status}): ${detail}`);
    (err as Error & { retryable?: boolean }).retryable = retryable;
    throw err;
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content ?? "";
  const usage = payload?.usage
    ? {
      prompt_tokens: payload.usage.prompt_tokens,
      completion_tokens: payload.usage.completion_tokens,
      total_tokens: payload.usage.total_tokens,
    }
    : null;

  return {
    text,
    parsed: schema ? parseJsonText(text) : text,
    model: payload?.model || model,
    provider: config.name,
    usage,
  };
}

export async function complete(req: CompletionRequest): Promise<CompletionResult> {
  const config = resolveProvider();
  return callChatCompletions(config, req);
}

export async function probeProvider(): Promise<{
  provider: AiProviderName;
  model: string;
  ok: boolean;
  message?: string;
}> {
  try {
    const config = resolveProvider();
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    return {
      provider: config.name,
      model: config.defaultModel,
      ok: response.ok,
      message: response.ok ? "reachable" : `HTTP ${response.status}`,
    };
  } catch (error) {
    const config = resolveProvider();
    return {
      provider: config.name,
      model: config.defaultModel,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getActiveProviderName(): AiProviderName {
  return resolveProvider().name;
}

export function getDefaultModel(): string {
  return resolveProvider().defaultModel;
}
