import {
  getPasswordStrength,
  getPasswordStrengthColor,
  MIN_PASSWORD_LENGTH,
} from "@/utils/passwordStrength";

export default function PasswordStrengthFeedback({ password }) {
  if (!password) return null;

  const { score, label, checks } = getPasswordStrength(password);
  const barWidth = `${Math.max((score / 5) * 100, 8)}%`;

  return (
    <div className="space-y-2 text-xs" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getPasswordStrengthColor(score)}`}
            style={{ width: barWidth }}
          />
        </div>
        <span className="text-muted-foreground shrink-0">{label}</span>
      </div>
      <ul className="space-y-0.5 text-muted-foreground">
        <li className={checks.minLength ? "text-green-600" : ""}>
          At least {MIN_PASSWORD_LENGTH} characters
        </li>
        <li className={checks.hasUpper && checks.hasLower ? "text-green-600" : ""}>
          Upper and lowercase letters
        </li>
        <li className={checks.hasNumber ? "text-green-600" : ""}>
          At least one number
        </li>
      </ul>
    </div>
  );
}
