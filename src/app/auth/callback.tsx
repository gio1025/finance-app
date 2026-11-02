import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AuthScreen, ErrorBanner, PrimaryButton } from "../../lib/auth/ui";
import { Palette, useBudget } from "../../lib/budget";
import { exchangeAuthCode } from "../../lib/auth/supabaseAuthService";

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const url = Linking.useURL();
  const router = useRouter();
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const [error, setError] = useState("");
  const errorCode = useMemo(() => {
    const fragment = url?.split("#", 2)[1];
    return fragment ? new URLSearchParams(fragment).get("error_code") : null;
  }, [url]);

  useEffect(() => {
    let active = true;
    async function verifyEmail() {
      if (!code) {
        setError(
          errorCode === "otp_expired"
            ? "This confirmation link has expired or was already used. If your account is confirmed, log in. Otherwise, request a new confirmation email."
            : "This confirmation link is incomplete or expired. Request a new email link."
        );
        return;
      }

      try {
        const { error: exchangeError } = await exchangeAuthCode(code);
        if (exchangeError) throw exchangeError;
        if (active) router.replace("/(tabs)");
      } catch {
        if (active) {
          setError("We couldn't confirm this email. Request a new confirmation link and try again.");
        }
      }
    }

    void verifyEmail();
    return () => {
      active = false;
    };
  }, [code, errorCode, router]);

  return (
    <AuthScreen title={error ? "Email not confirmed" : "Confirming your email"}>
      {error ? (
        <>
          <ErrorBanner message={error} />
          <PrimaryButton label="Back to log in" onPress={() => router.replace("/login")} />
        </>
      ) : (
        <View style={s.card}>
          <Text style={s.message}>Please wait while we finish setting up your account.</Text>
        </View>
      )}
    </AuthScreen>
  );
}

const makeStyles = (C: Palette) => ({
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    padding: 20,
  },
  message: { fontSize: 16, lineHeight: 24, color: C.muted, textAlign: "center" as const },
});
