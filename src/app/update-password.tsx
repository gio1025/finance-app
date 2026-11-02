import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import type { ElementRef } from "react";
import { TextInput } from "react-native";
import { useAuth } from "../lib/auth/AuthContext";
import { authErrorMessage } from "../lib/auth/types";
import { AuthScreen, ErrorBanner, Field, PrimaryButton } from "../lib/auth/ui";
import { hasActiveSession, exchangeAuthCode } from "../lib/auth/supabaseAuthService";
import { validateConfirm, validateNewPassword } from "../lib/auth/validation";
import { notify } from "../lib/budget";

export default function UpdatePassword() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const passwordRef = useRef<ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    let active = true;
    async function verifyLink() {
      try {
        if (code) {
          const { error } = await exchangeAuthCode(code);
          if (error) throw error;
        } else if (!(await hasActiveSession())) {
          throw new Error("Missing recovery session.");
        }
        if (active) setReady(true);
      } catch {
        if (active) {
          setFormError(
            "This password reset link is invalid or expired. Request a new link and try again."
          );
        }
      }
    }
    void verifyLink();
    return () => {
      active = false;
    };
  }, [code]);

  const submit = async () => {
    if (loading) return;
    setSubmitted(true);
    setFormError("");
    if (validateNewPassword(password) || validateConfirm(password, confirm)) return;

    setLoading(true);
    try {
      await updatePassword(password);
      notify("Password updated", "Your KuriPot password has been changed.");
      router.replace("/(tabs)");
    } catch (error) {
      setFormError(authErrorMessage(error));
      setLoading(false);
    }
  };

  const goBack = () => router.replace("/login");

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle="Use at least 8 characters, including a letter and a number."
      onBack={goBack}
      backLabel="Log in"
    >
      {!!formError && <ErrorBanner message={formError} />}
      {ready && (
        <>
          <Field
            label="New password"
            secure
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFormError("");
            }}
            error={submitted ? validateNewPassword(password) : ""}
            placeholder="Create a new password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />
          <Field
            label="Confirm new password"
            secure
            inputRef={passwordRef}
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              setFormError("");
            }}
            error={submitted ? validateConfirm(password, confirm) : ""}
            placeholder="Type it again"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            editable={!loading}
          />
          <PrimaryButton label="Update password" onPress={submit} loading={loading} />
        </>
      )}
    </AuthScreen>
  );
}
