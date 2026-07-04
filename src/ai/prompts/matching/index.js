/**
 * Matching prompt builders — reserved for supplier/buyer matching flows.
 */

export function buildMatchPrompt({ buyerProfile, supplierProfile }) {
  return `Evaluate the compatibility between this buyer and supplier for trade-show matchmaking.
Return a JSON object with: score (0-100), reasons (array of strings), concerns (array of strings).

BUYER:
${JSON.stringify(buyerProfile, null, 2)}

SUPPLIER:
${JSON.stringify(supplierProfile, null, 2)}`;
}
