import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import type { ElementRef, ReactNode, Ref } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Palette, useBudget } from "../budget";
import { BrandLockup } from "../Brand";
import { SocialProvider } from "./types";
import { passwordRules, passwordStrength } from "./validation";

/* ---------- page layout: keyboard avoiding, scrollable, large title ---------- */

export function AuthScreen({
  title,
  subtitle,
  onBack,
  backLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 768;
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, desktop && s.desktopScroll]}
        >
          <View style={[s.content, desktop && s.desktopContent]}>
            {onBack && (
              <Pressable onPress={onBack} style={s.back} hitSlop={10} accessibilityRole="button">
                <Ionicons name="chevron-back" size={24} color={C.ink} />
                <Text style={s.backText}>{backLabel ?? "Back"}</Text>
              </Pressable>
            )}
            <View style={s.brand}>
              <BrandLockup markSize={56} />
            </View>
            <Text style={s.title} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
            <View style={s.body}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- text field with label, error, and show/hide password ---------- */

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  secure?: boolean; // password field with a show/hide toggle
  inputRef?: Ref<ElementRef<typeof TextInput>>;
};

export function Field({
  label,
  error,
  secure,
  inputRef,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const { colors: C, isDark } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, focused && s.inputFocused, !!error && s.inputError]}>
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholderTextColor={C.muted}
          keyboardAppearance={isDark ? "dark" : "light"}
          selectionColor={C.ink}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secure ? hidden : false}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={22} color={C.muted} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

/* ---------- primary button with loading state ---------- */

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [s.primary, (pressed || disabled) && { opacity: 0.75 }]}
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading, disabled: !!(loading || disabled) }}
    >
      {loading ? (
        <ActivityIndicator color={C.onInk} />
      ) : (
        <Text style={s.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

/* ---------- error banner (fades in) ---------- */

export function ErrorBanner({ message }: { message: string }) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View accessibilityRole="alert" style={s.banner}>
      <Ionicons name="alert-circle" size={20} color={C.expense} />
      <Text style={s.bannerText}>{message}</Text>
    </View>
  );
}

/* ---------- "or" divider + Apple / Google buttons ---------- */

export function SocialButtons({
  onPress,
  disabled,
}: {
  onPress: (p: SocialProvider) => void;
  disabled?: boolean;
}) {
  const { colors: C, isDark } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  // Apple's guidelines: black button in light mode, white in dark mode
  const appleBg = isDark ? "#FFFFFF" : "#000000";
  const appleFg = isDark ? "#000000" : "#FFFFFF";
  return (
    <View style={{ gap: 12 }}>
      <View style={s.dividerRow}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>or</Text>
        <View style={s.dividerLine} />
      </View>
      <Pressable
        onPress={() => onPress("apple")}
        disabled={disabled}
        style={({ pressed }) => [s.social, { backgroundColor: appleBg }, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
      >
        <Ionicons name="logo-apple" size={22} color={appleFg} />
        <Text style={[s.socialText, { color: appleFg }]}>Continue with Apple</Text>
      </Pressable>
      <Pressable
        onPress={() => onPress("google")}
        disabled={disabled}
        style={({ pressed }) => [
          s.social,
          { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <Ionicons name="logo-google" size={20} color={C.ink} />
        <Text style={[s.socialText, { color: C.ink }]}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

/* ---------- password strength meter + checklist ---------- */

export function PasswordStrength({ password }: { password: string }) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const { score, label } = passwordStrength(password);
  const barColor = score <= 1 ? C.expense : score === 2 ? "#F59E0B" : C.income;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.meterRow}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[s.meterBar, { backgroundColor: i <= score ? barColor : C.line }]}
          />
        ))}
        <Text style={[s.meterLabel, { color: score ? barColor : C.muted }]}>
          {label || "Strength"}
        </Text>
      </View>
      <View style={{ gap: 4 }}>
        {passwordRules(password).map((r) => (
          <View key={r.label} style={s.ruleRow}>
            <Ionicons
              name={r.ok ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={r.ok ? C.income : C.muted}
            />
            <Text style={[s.ruleText, r.ok && { color: C.ink }]}>{r.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    scroll: { padding: 24, paddingBottom: 48, flexGrow: 1 },
    desktopScroll: { justifyContent: "center" },
    content: { width: "100%" },
    desktopContent: {
      maxWidth: 520,
      alignSelf: "center",
      backgroundColor: C.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: C.line,
      padding: 32,
    },
    back: { flexDirection: "row", alignItems: "center", marginLeft: -6, marginBottom: 16, alignSelf: "flex-start" },
    backText: { fontSize: 17, color: C.ink, fontWeight: "600" },
    brand: { marginBottom: 24 },
    title: { fontSize: 32, fontWeight: "800", color: C.ink, letterSpacing: -0.6 },
    subtitle: { fontSize: 17, color: C.muted, marginTop: 6, lineHeight: 24 },
    body: { marginTop: 28, gap: 18 },

    field: { gap: 6 },
    label: { fontSize: 15, fontWeight: "600", color: C.muted },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 14,
      paddingHorizontal: 16,
      height: 56,
    },
    inputFocused: { borderColor: C.accent },
    inputError: { borderColor: C.expense },
    input: { flex: 1, fontSize: 17, color: C.ink, height: 56 },
    error: { fontSize: 14, fontWeight: "600", color: C.expense },

    primary: {
      height: 56,
      borderRadius: 14,
      backgroundColor: C.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { fontSize: 17, fontWeight: "700", color: C.onInk },

    banner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: C.expenseSoft,
      borderRadius: 14,
      padding: 14,
    },
    bannerText: { flex: 1, fontSize: 15, color: C.ink, lineHeight: 21 },

    dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.line },
    dividerText: { fontSize: 14, color: C.muted, fontWeight: "600" },
    social: {
      height: 54,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    socialText: { fontSize: 17, fontWeight: "600" },

    meterRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    meterBar: { flex: 1, height: 6, borderRadius: 3 },
    meterLabel: { width: 60, textAlign: "right", fontSize: 13, fontWeight: "700" },
    ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    ruleText: { fontSize: 14, color: C.muted },
  });
