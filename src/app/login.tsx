import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import type { ElementRef } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/auth/AuthContext";
import { SocialProvider, authErrorCode, authErrorMessage } from "../lib/auth/types";
import { AuthScreen, ErrorBanner, Field, PrimaryButton, SocialButtons } from "../lib/auth/ui";
import { validateEmail, validateLoginPassword } from "../lib/auth/validation";
import { Palette, useBudget } from "../lib/budget";

export default function Login() {
  const router = useRouter();
  const { colors: C } = useBudget();
  const { signIn, signInWithProvider, rememberedEmail } = useAuth();
  const s = useMemo(() => makeStyles(C), [C]);

  // Controlled inputs
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const email = emailInput ?? rememberedEmail;
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const errors = { email: validateEmail(email), password: validateLoginPassword(password) };

  const submit = async () => {
    if (loading) return;
    setSubmitted(true);
    setFormError("");
    setNeedsConfirmation(false);
    if (errors.email || errors.password) return;
    setLoading(true);
    try {
      await signIn(email, password, remember);
      // Nothing else to do: the protected routes switch to the app on their own.
    } catch (e) {
      setFormError(authErrorMessage(e));
      setNeedsConfirmation(authErrorCode(e) === "email-not-confirmed");
      setLoading(false);
    }
  };

  const social = async (provider: SocialProvider) => {
    setFormError("");
    setLoading(true);
    try {
      await signInWithProvider(provider, remember);
    } catch (e) {
      setFormError(authErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Log in to see your budget.">
      {!!formError && <ErrorBanner message={formError} />}

      <Field
        label="Email"
        value={email}
        onChangeText={(t) => {
          setEmailInput(t);
          setFormError("");
          setNeedsConfirmation(false);
        }}
        error={submitted && !email.trim() ? errors.email : ""}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
      />

      <Field
        label="Password"
        secure
        inputRef={passwordRef}
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setFormError("");
          setNeedsConfirmation(false);
        }}
        error={submitted && !password ? errors.password : ""}
        placeholder="Your password"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!loading}
      />

      {needsConfirmation && (
        <Text style={s.helpText}>
          Open the latest confirmation email before logging in. If the account is already
          confirmed, try logging in again or use Forgot password to reset your password.
        </Text>
      )}

      <View style={s.optionsRow}>
        <View style={s.rememberWrap}>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: C.line, true: C.income }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Remember me"
          />
          <Text style={s.rememberText}>Remember email</Text>
        </View>
        <Pressable onPress={() => router.push("/forgot-password")} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>Forgot password?</Text>
        </Pressable>
      </View>

      <PrimaryButton label="Log in" onPress={submit} loading={loading} />

      <SocialButtons onPress={social} disabled={loading} />

      <View style={s.switchRow}>
        <Text style={s.muted}>New here?</Text>
        <Pressable onPress={() => router.push("/sign-up")} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>Create an account</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    optionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rememberWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
    rememberText: { fontSize: 16, color: C.ink },
    link: { fontSize: 16, fontWeight: "700", color: C.ink },
    muted: { fontSize: 16, color: C.muted },
    helpText: { fontSize: 14, lineHeight: 20, color: C.muted },
    switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 },
  });