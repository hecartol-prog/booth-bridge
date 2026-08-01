/** Keep in sync with supabase/config.toml auth.minimum_password_length */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * @returns {{ score: number, label: string, checks: Record<string, boolean> }}
 */
export function getPasswordStrength(password) {
  const checks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (checks.minLength) score += 1;
  if (password.length >= 12) score += 1;
  if (checks.hasLower && checks.hasUpper) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSymbol) score += 1;

  const labels = ["", "Weak", "Fair", "Good", "Strong", "Strong"];
  return { score, label: labels[score] || "Weak", checks };
}

/** Matches supabase password_requirements = lower_upper_letters_digits_symbols */
export function isPasswordAcceptable(password) {
  const { checks } = getPasswordStrength(password);
  return checks.minLength && checks.hasLower && checks.hasUpper && checks.hasNumber && checks.hasSymbol;
}

export function getPasswordStrengthColor(score) {
  if (score <= 1) return "bg-red-500";
  if (score === 2) return "bg-orange-500";
  if (score === 3) return "bg-yellow-500";
  return "bg-green-500";
}
