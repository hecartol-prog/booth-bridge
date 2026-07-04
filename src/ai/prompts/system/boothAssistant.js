/**
 * Booth assistant prompt builders (verbatim from AiBoothAssistant.jsx / aiClient).
 */

/**
 * @param {{ companyName?: string, context: string, history: string, message: string, includeShortAnswerSuffix?: boolean }} params
 */
export function buildBoothAssistantPrompt({
  companyName,
  context,
  history,
  message,
  includeShortAnswerSuffix = true,
}) {
  const suffix = includeShortAnswerSuffix
    ? "\n\nProvide a short, helpful answer."
    : "";

  return `You are the AI assistant for ${companyName}, an exhibitor at a trade show. 
Answer questions based ONLY on the following company information. Be concise and helpful.
If you don't know the answer from the context, say "I don't have that information — please contact us directly."

COMPANY INFORMATION:
${context}

CONVERSATION HISTORY:
${history}

User question: ${message}${suffix}`;
}

/**
 * @param {{ companyName?: string, context: string, history: Array<{role: string, content: string}>, message: string }} params
 */
export function buildBoothAssistantChatPrompt({ companyName, context, history, message }) {
  const historyText = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `You are the AI assistant for ${companyName}, an exhibitor at a trade show.
Answer questions based ONLY on the following company information. Be concise and helpful.
If you don't know the answer from the context, say "I don't have that information — please contact us directly."

COMPANY INFORMATION:
${context}

CONVERSATION HISTORY:
${historyText}

User: ${message}`;
}
