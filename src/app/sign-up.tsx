import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import type { ElementRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/auth/AuthContext";
import { SocialProvider, authErrorMessage } from "../lib/auth/types";
import {
    AuthScreen,
    ErrorBanner,
    Field,
    PasswordStrength,
    PrimaryButton,
    SocialButtons,
} from "../lib/auth/ui";
import {
    validateConfirm,
    validateEmail,
    validateName,
    validateNewPassword,
} from "../lib/auth/validation";
import { Palette, useBudget } from "../lib/budget";

type Key = "name" | "email" | "password" | "confirm";

export default function SignUp() {
  const router = useRouter();
  const { colors: C } = useBudget();
  const { signUp, signInWithProvider } = useAuth();
  const s = useMemo(() => makeStyles(C), [C]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState<Record<Key, boolean>>({
    name: false,
    email: false,
    password: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const emailRef = useRef<ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);
  const confirmRef = useRef<ElementRef<typeof TextInput>>(null);

  const errors: Record<Key, string> = {
    name: validateName(name),
    email: validateEmail(email),
    password: validateNewPassword(password),
    confirm: validateConfirm(password, confirm),
  };
  const touch = (k: Key) => setTouched((t) => ({ ...t, [k]: true }));
  const clear = () => setFormError("");

  const submit = async () => {
    if (loading) return;
    setTouched({ name: true, email: true, password: true, confirm: true });
    clear();
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    try {
      const signedIn = await signUp({ name, email, password });
      setConfirmationRequired(!signedIn);
    } catch (e) {
      setFormError(authErrorMessage(e));
      setLoading(false);
    }
  };

  const social = async (provider: SocialProvider) => {
    clear();
    setLoading(true);
    try {
      await signInWithProvider(provider, true);
    } catch (e) {
      setFormError(authErrorMessage(e));
      setLoading(false);
    }
  };

  const goLogin = () => (router.canGoBack() ? router.back() : router.replace("/login"));

  if (confirmationRequired) {
    return (
      <AuthScreen
        title="Check your email"
        subtitle="Confirm your email address to finish creating your KuriPot account."
        onBack={() => router.replace("/login")}
        backLabel="Log in"
      >
        <View style={s.confirmationCard}>
          <Text style={s.muted}>
            We sent a confirmation link to <Text style={s.link}>{email.trim()}</Text>. Open it on
            this device to continue.
          </Text>
        </View>
        <PrimaryButton label="Back to log in" onPress={() => router.replace("/login")} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Create account"
      subtitle="Start tracking your money in a minute."
      onBack={goLogin}
      backLabel="Log in"
    >
      {!!formError && <ErrorBanner message={formError} />}

      <Field
        label="Full name"
        value={name}
        onChangeText={(t) => {
          setName(t);
          clear();
        }}
        onBlur={() => touch("name")}
        error={touched.name ? errors.name : ""}
        placeholder="Alex Rivera"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        editable={!loading}
      />

      <Field
        label="Email"
        inputRef={emailRef}
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          clear();
        }}
        onBlur={() => touch("email")}
        error={touched.email ? errors.email : ""}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
      />

      <View style={{ gap: 12 }}>
        <Field
          label="Password"
          secure
          inputRef={passwordRef}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            clear();
          }}
          onBlur={() => touch("password")}
          error={touched.password ? errors.password : ""}
          placeholder="Create a password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!loading}
        />
        <PasswordStrength password={password} />
      </View>

      <Field
        label="Confirm password"
        secure
        inputRef={confirmRef}
        value={confirm}
        onChangeText={(t) => {
          setConfirm(t);
          clear();
        }}
        onBlur={() => touch("confirm")}
        error={touched.confirm ? errors.confirm : ""}
        placeholder="Type it again"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!loading}
      />

      <PrimaryButton label="Create account" onPress={submit} loading={loading} />

      <SocialButtons onPress={social} disabled={loading} />

      <View style={s.switchRow}>
        <Text style={s.muted}>Already have an account?</Text>
        <Pressable onPress={goLogin} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>Log in</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    link: { fontSize: 16, fontWeight: "700", color: C.ink },
    muted: { fontSize: 16, color: C.muted },
    switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 },
    confirmationCard: {
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.line,
      padding: 20,
    },
  });