/**
 * Classification prompt builders.
 */

export function buildClassifyPrompt({ text, labels }) {
  return `Classify the following text into one of these labels: ${labels.join(", ")}.
Return a JSON object with: label (string), confidence (0-100 number).

TEXT:
${text}`;
}
