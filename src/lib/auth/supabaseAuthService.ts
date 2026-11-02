import * as Linking from "expo-linking";
import { Session as SupabaseSession } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../supabase";
import {
  AuthService,
  Session,
  SignUpInput,
  SocialProvider,
  authError,
} from "./types";

function requireSupabase() {
  if (!supabase || !isSupabaseConfigured) throw authError("backend-not-configured");
  return supabase;
}

function toSession(session: SupabaseSession): Session {
  const user = session.user;
  return {
    token: session.access_token,
    user: {
      id: user.id,
      email: user.email ?? "",
      name:
        (typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name) ||
        user.email?.split("@")[0] ||
        "",
    },
  };
}

function mapAuthError(error: unknown): never {
  const value =
    error && typeof error === "object"
      ? (error as { code?: string; name?: string; message?: string; status?: number })
      : null;
  const code = value?.code ?? "";
  const message = value?.message?.toLowerCase() ?? "";

  if (
    value?.status === 429 ||
    ["over_email_send_rate_limit", "over_request_rate_limit"].includes(code) ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    throw authError("rate-limited");
  }
  if (code === "signup_disabled" || message.includes("signups not allowed")) {
    throw authError("signup-disabled");
  }
  if (
    code === "captcha_failed" ||
    code === "captcha_verification_failed" ||
    message.includes("captcha")
  ) {
    throw authError("verification-failed");
  }
  if (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed") ||
    message.includes("email address is not confirmed")
  ) {
    throw authError("email-not-confirmed");
  }
  if (
    ["invalid_credentials", "invalid_login_credentials", "user_not_found"].includes(code)
  ) {
    throw authError("invalid-credentials");
  }
  if (
    ["email_exists", "user_already_exists"].includes(code) ||
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    throw authError("email-in-use");
  }
  if (
    ["weak_password", "password_too_short", "password_too_weak"].includes(code) ||
    message.includes("password should be") ||
    message.includes("password is too short")
  ) {
    throw authError("weak-password");
  }
  if (
    ["validation_failed", "email_address_invalid", "invalid_email"].includes(code) ||
    message.includes("invalid email")
  ) {
    throw authError("invalid-email");
  }
  if (
    code === "email_address_not_authorized" ||
    message.includes("email address not authorized") ||
    message.includes("email not authorized")
  ) {
    throw authError("email-not-authorized");
  }
  if (
    value?.name === "AuthRetryableFetchError" ||
    ["fetch_failed", "request_timeout", "timeout"].includes(code) ||
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("timed out")
  ) {
    throw authError("network");
  }
  throw authError("unknown");
}

export const supabaseAuthService: AuthService = {
  async getSession() {
    if (!supabase || !isSupabaseConfigured) return null;
    const client = supabase;
    const { data, error } = await client.auth.getSession();
    if (error) mapAuthError(error);
    return data.session ? toSession(data.session) : null;
  },

  subscribeToAuthChanges(listener) {
    if (!supabase || !isSupabaseConfigured) return () => {};
    const client = supabase;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      listener(session ? toSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email, password) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) mapAuthError(error);
    if (!data.session) throw authError("invalid-credentials");
    return toSession(data.session);
  },

  async signUp({ name, email, password }: SignUpInput) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: Linking.createURL("auth/callback"),
      },
    });
    if (error) mapAuthError(error);
    return data.session ? toSession(data.session) : null;
  },

  async signInWithProvider(_provider: SocialProvider) {
    throw authError("provider-unavailable");
  },

  async sendPasswordReset(email) {
    const client = requireSupabase();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("update-password"),
    });
    if (error) mapAuthError(error);
  },

  async updatePassword(password) {
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password });
    if (error) mapAuthError(error);
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) mapAuthError(error);
  },
};

export function exchangeAuthCode(code: string) {
  const client = requireSupabase();
  return client.auth.exchangeCodeForSession(code);
}

export async function hasActiveSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) mapAuthError(error);
  return Boolean(data.session);
}
