// Pure validation helpers. Each returns an error message, or "" when the value is fine.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail = (v: string) => {
  const t = v.trim();
  if (!t) return "Enter your email";
  if (!EMAIL_RE.test(t)) return "Enter a valid email address";
  return "";
};

export const validateName = (v: string) =>
  v.trim().length < 2 ? "Enter your full name" : "";

// Login only checks that something was typed (never reveal password rules there)
export const validateLoginPassword = (pw: string) => (pw ? "" : "Enter your password");

export const validateNewPassword = (pw: string) => {
  if (!pw) return "Create a password";
  if (pw.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Include at least one letter and one number";
  return "";
};

export const validateConfirm = (pw: string, confirm: string) => {
  if (!confirm) return "Confirm your password";
  return pw === confirm ? "" : "Passwords don't match";
};

export type PasswordRule = { label: string; ok: boolean };

export const passwordRules = (pw: string): PasswordRule[] => [
  { label: "At least 8 characters", ok: pw.length >= 8 },
  { label: "Upper and lower case letters", ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "A number", ok: /\d/.test(pw) },
  { label: "A symbol (like ! ? #)", ok: /[^A-Za-z0-9]/.test(pw) },
];

/** score 0-4 and a label, for the strength meter */
export function passwordStrength(pw: string) {
  const score = pw ? passwordRules(pw).filter((r) => r.ok).length : 0;
  const capped = pw.length < 8 ? Math.min(score, 1) : score;
  return { score: capped, label: ["", "Weak", "Fair", "Good", "Strong"][capped] };
}