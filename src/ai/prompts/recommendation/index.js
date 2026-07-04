/**
 * Recommendation prompt builders — reserved for product/supplier recommendations.
 */

export function buildRecommendPrompt({ userProfile, candidates, goal }) {
  return `Recommend the best options for this user based on their profile and goal.
Return a JSON object with: recommendations (array of { id, score, reason }).

GOAL:
${goal}

USER:
${JSON.stringify(userProfile, null, 2)}

CANDIDATES:
${JSON.stringify(candidates, null, 2)}`;
}
