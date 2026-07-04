/**
 * Summary prompt builders — reserved for future lead summarization flows.
 */

export function buildLeadSummaryPrompt({ leads, context = "" }) {
  return `Summarize the following leads and highlight follow-up priorities.

CONTEXT:
${context}

LEADS:
${JSON.stringify(leads, null, 2)}`;
}
