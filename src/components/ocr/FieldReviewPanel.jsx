import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confidenceTier,
  requiresReview,
} from "@/pipeline/documentIntelligence/entityValidation";

const TIER_STYLES = {
  green: "border-green-400 bg-green-50/50",
  yellow: "border-amber-400 bg-amber-50/50",
  red: "border-red-400 bg-red-50/50",
  neutral: "border-border",
};

/**
 * RC10 field review panel — highlights only uncertain fields.
 * @param {Object} props
 * @param {Array<{ key: string, label: string, alwaysShow?: boolean }>} props.fields
 * @param {Record<string, string>} props.values
 * @param {(key: string, value: string) => void} props.onChange
 * @param {Record<string, number>|null} [props.fieldConfidence]
 * @param {Record<string, string[]>} [props.validationFlags]
 * @param {Record<string, string>} [props.fieldErrors]
 */
export default function FieldReviewPanel({
  fields,
  values,
  onChange,
  fieldConfidence = null,
  validationFlags = {},
  fieldErrors = {},
}) {
  const uncertainCount = fields.filter((f) => {
    const score = fieldConfidence?.[f.key];
    return score == null || requiresReview(score);
  }).length;

  return (
    <div className="space-y-3">
      {fieldConfidence && uncertainCount > 0 && (
        <p className="text-xs text-muted-foreground rounded-md border px-3 py-2 bg-muted/30">
          {uncertainCount} field{uncertainCount === 1 ? "" : "s"} need review (below 95% confidence).
          High-confidence fields are shown without highlight.
        </p>
      )}

      {fields.map((field) => {
        const value = values[field.key] ?? "";
        if (value === "" && !fieldConfidence?.[field.key] && !field.alwaysShow) {
          return null;
        }

        const score = fieldConfidence?.[field.key];
        const tier = score != null ? confidenceTier(score) : "neutral";
        const needsHighlight = score == null || requiresReview(score);
        const borderClass = needsHighlight ? TIER_STYLES[tier] : TIER_STYLES.neutral;
        const flags = validationFlags[field.key] || [];

        return (
          <div key={field.key}>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {score != null && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    tier === "green"
                      ? "text-green-700 bg-green-100"
                      : tier === "yellow"
                        ? "text-amber-700 bg-amber-100"
                        : "text-red-700 bg-red-100"
                  }`}
                >
                  {score}%
                </span>
              )}
            </div>
            <Input
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={`mt-1 ${borderClass} ${fieldErrors[field.key] ? "border-red-500" : ""}`}
            />
            {fieldErrors[field.key] && (
              <p className="text-xs text-red-500 mt-0.5">{fieldErrors[field.key]}</p>
            )}
            {flags.map((flag) => (
              <p key={flag} className="text-xs text-amber-600 mt-0.5">{flag}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export { requiresReview, confidenceTier };
