import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth/AuthContext";
import { authErrorMessage } from "../lib/auth/types";
import { AuthScreen, ErrorBanner, Field, PrimaryButton } from "../lib/auth/ui";
import { validateEmail } from "../lib/auth/validation";
import { Palette, useBudget } from "../lib/budget";

export default function ForgotPassword() {
  const router = useRouter();
  const { colors: C } = useBudget();
  const { sendPasswordReset } = useAuth();
  const s = useMemo(() => makeStyles(C), [C]);

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);

  const error = validateEmail(email);
  const goLogin = () => (router.canGoBack() ? router.back() : router.replace("/login"));

  const submit = async () => {
    if (loading) return;
    setTouched(true);
    setFormError("");
    if (error) return;
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setFormError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // Confirmation view (same wording whether or not the account exists)
  if (sent) {
    return (
      <AuthScreen title="Check your email" onBack={goLogin} backLabel="Log in">
        <View style={s.sentCard}>
          <View style={s.sentIcon}>
            <Ionicons name="mail-outline" size={28} color={C.income} />
          </View>
          <Text style={s.sentText}>
            If an account exists for <Text style={s.bold}>{email.trim()}</Text>, we've sent a link to
            reset your password. It can take a few minutes to arrive.
          </Text>
        </View>
        <PrimaryButton label="Back to log in" onPress={goLogin} />
        <Pressable
          onPress={() => setSent(false)}
          style={s.again}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Text style={s.link}>Use a different email</Text>
        </Pressable>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a link to reset it."
      onBack={goLogin}
      backLabel="Log in"
    >
      {!!formError && <ErrorBanner message={formError} />}

      <Field
        label="Email"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setFormError("");
        }}
        onBlur={() => setTouched(true)}
        error={touched ? error : ""}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
        editable={!loading}
      />

      <PrimaryButton label="Send reset link" onPress={submit} loading={loading} />
    </AuthScreen>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    sentCard: {
      backgroundColor: C.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.line,
      padding: 20,
      alignItems: "center",
      gap: 14,
    },
    sentIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.incomeSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    sentText: { fontSize: 16, lineHeight: 24, color: C.muted, textAlign: "center" },
    bold: { fontWeight: "700", color: C.ink },
    again: { alignSelf: "center", padding: 6 },
    link: { fontSize: 16, fontWeight: "700", color: C.ink },
  });