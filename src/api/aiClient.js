/**
 * aiClient — LLM and document extraction abstraction.
 * Replaces base44.integrations.Core.InvokeLLM / ExtractDataFromUploadedFile in Phase 2+.
 *
 * Phase 1: Base44 delegation only; not wired into OCR, onboarding, or AI assistant.
 */

import { base44 } from "@/api/base44Client";
import { isBase44, isAiEnabled } from "@/config/backend";

function supabaseNotReady(method) {
  throw new Error(
    `[aiClient] ${method} is not available until Phase 4. Use VITE_DATA_BACKEND=base44.`
  );
}

function ensureAiEnabled() {
  if (!isAiEnabled()) {
    throw new Error("[aiClient] AI features are disabled (VITE_AI_ENABLED=false)");
  }
}

/**
 * General-purpose LLM invocation with optional JSON schema.
 */
export async function invokeLLM(params) {
  ensureAiEnabled();
  if (isBase44()) {
    return base44.integrations.Core.InvokeLLM(params);
  }
  supabaseNotReady("invokeLLM");
}

/**
 * Extract structured data from an uploaded file URL.
 */
export async function extractFromUploadedFile(params) {
  ensureAiEnabled();
  if (isBase44()) {
    return base44.integrations.Core.ExtractDataFromUploadedFile(params);
  }
  supabaseNotReady("extractFromUploadedFile");
}

/** Preset: business card OCR (used by OCRScanner) */
export async function extractBusinessCard(imageUrl) {
  const prompt =
    "Extract all contact information from this business card image. Return a JSON object with: first_name, last_name, full_name, position, company, department, email, phone, mobile, whatsapp, website, address, country, city, linkedin, confidence (0-100 number). Set fields to empty string if not found.";
  return invokeLLM({
    prompt,
    file_urls: [imageUrl],
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        full_name: { type: "string" },
        position: { type: "string" },
        company: { type: "string" },
        department: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        mobile: { type: "string" },
        whatsapp: { type: "string" },
        website: { type: "string" },
        address: { type: "string" },
        country: { type: "string" },
        city: { type: "string" },
        linkedin: { type: "string" },
        confidence: { type: "number" },
      },
    },
  });
}

/** Preset: event badge OCR */
export async function extractBadge(imageUrl) {
  const prompt =
    "Extract all information from this trade show badge. Return a JSON object with: first_name, last_name, full_name, company, position, country, industry, badge_number, booth_number, event_name, confidence (0-100 number). Set fields to empty string if not found.";
  return invokeLLM({
    prompt,
    file_urls: [imageUrl],
    add_context_from_internet: false,
    response_json_schema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        full_name: { type: "string" },
        company: { type: "string" },
        position: { type: "string" },
        country: { type: "string" },
        industry: { type: "string" },
        badge_number: { type: "string" },
        booth_number: { type: "string" },
        event_name: { type: "string" },
        confidence: { type: "number" },
      },
    },
  });
}

/**
 * AI booth assistant chat (context + history + user message).
 */
export async function boothAssistantChat({ companyName, context, history, message }) {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `You are the AI assistant for ${companyName}, an exhibitor at a trade show.
Answer questions based ONLY on the following company information. Be concise and helpful.
If you don't know the answer from the context, say "I don't have that information — please contact us directly."

COMPANY INFORMATION:
${context}

CONVERSATION HISTORY:
${historyText}

User: ${message}`;

  const result = await invokeLLM({ prompt });
  return typeof result === "string" ? result : result?.response || result?.text || String(result);
}

export const ai = {
  invokeLLM,
  extractFromUploadedFile,
  extractBusinessCard,
  extractBadge,
  boothAssistantChat,
};
