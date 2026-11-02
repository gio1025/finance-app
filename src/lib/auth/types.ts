export type AuthUser = { id: string; email: string; name: string };
export type Session = { user: AuthUser; token: string };
export type SocialProvider = "apple" | "google";
export type SignUpInput = { name: string; email: string; password: string };

export interface AuthService {
  getSession(): Promise<Session | null>;
  subscribeToAuthChanges(listener: (session: Session | null) => void): () => void;
  signIn(email: string, password: string): Promise<Session>;
  signUp(input: SignUpInput): Promise<Session | null>;
  signInWithProvider(provider: SocialProvider): Promise<Session>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

export type AuthErrorCode =
  | "invalid-credentials"
  | "email-not-confirmed"
  | "email-in-use"
  | "weak-password"
  | "invalid-email"
  | "email-not-authorized"
  | "network"
  | "rate-limited"
  | "signup-disabled"
  | "verification-failed"
  | "backend-not-configured"
  | "provider-unavailable"
  | "unknown";

// Friendly, user-facing messages for every error code
const MESSAGES: Record<AuthErrorCode, string> = {
  "invalid-credentials": "That email and password don't match. Check them and try again.",
  "email-not-confirmed": "Confirm your email address before logging in.",
  "email-in-use": "An account with this email already exists. Try logging in instead.",
  "weak-password": "Choose a stronger password: at least 8 characters with a letter and a number.",
  "invalid-email": "Enter a valid email address.",
  "email-not-authorized":
    "Supabase's test email service can't send to this address. Configure custom SMTP in the Supabase dashboard, then try again.",
  network: "Can't reach the server. Check your connection and try again.",
  "rate-limited":
    "Too many sign-up or email requests. Wait before trying again. If this keeps happening, configure custom SMTP in Supabase.",
  "signup-disabled": "New account creation is disabled for this project. Contact the app owner.",
  "verification-failed":
    "We couldn't verify this sign-up request. Try again, and contact the app owner if it keeps happening.",
  "backend-not-configured":
    "Supabase isn't connected yet. Add the project URL and publishable key, then restart the app.",
  "provider-unavailable": "This sign-in option isn't set up yet. Use your email for now.",
  unknown: "Something went wrong. Please try again.",
};

/** Create an error that carries a code. Services throw these. */
export function authError(code: AuthErrorCode) {
  return Object.assign(new Error(MESSAGES[code]), { code });
}

export function authErrorCode(error: unknown): AuthErrorCode | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = error.code;
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(MESSAGES, code)
    ? (code as AuthErrorCode)
    : null;
}

/** Turn anything thrown into a message safe to show the user. */
export function authErrorMessage(e: unknown): string {
  const code = authErrorCode(e);
  return code ? MESSAGES[code] : MESSAGES.unknown;
}