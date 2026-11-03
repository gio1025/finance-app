import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Entry, Palette, entryDate, toDateStr, useBudget } from "./budget";
import { haptics } from "./haptics";
import { radius, type } from "./theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function PageHeader({
  title,
  subtitle,
  action,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={[s.pageHeader, style]}>
      <View style={s.pageHeaderText}>
        <Text style={s.pageTitle} accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && <Text style={s.pageSubtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

/* ---------- money: spoken amounts for VoiceOver ---------- */

const spokenCache = new Map<string, Intl.NumberFormat>();

/** "1,240.00 Philippine pesos": read as a currency amount, not digit soup */
export function useSpokenMoney() {
  const { currency } = useBudget();
  return useCallback(
    (n: number) => {
      let f = spokenCache.get(currency);
      if (!f) {
        try {
          f = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            currencyDisplay: "name",
          });
        } catch {
          f = new Intl.NumberFormat();
        }
        spokenCache.set(currency, f);
      }
      return f.format(n);
    },
    [currency]
  );
}

/** Balance / amount text. Tabular figures; color only if you pass one (gain or loss). */
export function MoneyText({
  value,
  variant = "amount",
  sign,
  color,
  style,
}: {
  value: number;
  variant?: "hero" | "amount";
  sign?: "+" | "−";
  color?: string;
  style?: TextStyle;
}) {
  const { money, colors: C } = useBudget();
  const spoken = useSpokenMoney();
  const prefix = sign ?? (value < 0 ? "−" : "");
  const label = `${prefix === "+" ? "Plus " : prefix ? "Minus " : ""}${spoken(Math.abs(value))}`;
  return (
    <Text
      style={[variant === "hero" ? type.hero : type.amount, { color: color ?? C.textPrimary }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      accessibilityLabel={label}
    >
      {prefix}
      {money(Math.abs(value))}
    </Text>
  );
}

/* ---------- day grouping ---------- */

export function dayLabel(date: string) {
  const today = toDateStr(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (date === today) return "Today";
  if (date === toDateStr(y)) return "Yesterday";
  const d = new Date(date + "T00:00:00");
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    undefined,
    sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }
  );
}

/** Entries must already be sorted newest first */
export function groupByDay(entries: Entry[]) {
  const out: { key: string; title: string; data: Entry[] }[] = [];
  for (const e of entries) {
    const d = entryDate(e);
    const last = out[out.length - 1];
    if (last && last.key === d) last.data.push(e);
    else out.push({ key: d, title: dayLabel(d), data: [e] });
  }
  return out;
}

/* ---------- small building blocks ---------- */

export function SectionHeader({
  title,
  titleFitsOneLine = false,
  titleStyle,
  meta,
  actionLabel,
  onAction,
}: {
  title: string;
  titleFitsOneLine?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={s.sectionHead}>
      <Text
        style={[s.sectionTitle, titleFitsOneLine && { flexShrink: 1 }, titleStyle]}
        numberOfLines={titleFitsOneLine ? 1 : undefined}
        adjustsFontSizeToFit={titleFitsOneLine}
        minimumFontScale={titleFitsOneLine ? 0.55 : undefined}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text style={s.action}>{actionLabel}</Text>
        </Pressable>
      ) : meta ? (
        <Text style={s.meta}>{meta}</Text>
      ) : null}
    </View>
  );
}

export function DayHeader({ label }: { label: string }) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <Text style={s.day} accessibilityRole="header">
      {label}
    </Text>
  );
}

export function Hairline({ inset = 0 }: { inset?: number }) {
  const { colors: C } = useBudget();
  return (
    <View
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.hairline, marginLeft: inset }}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  dashed,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  dashed?: boolean;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[s.chip, selected && s.chipOn, dashed && s.chipDashed]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {icon && <Ionicons name={icon} size={16} color={selected ? C.onAccent : C.textSecondary} />}
      <Text style={[s.chipText, selected && { color: C.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

export function ProgressTrack({ value }: { value: number }) {
  const { colors: C } = useBudget();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      style={{ height: 3, borderRadius: 1.5, backgroundColor: C.hairline, overflow: "hidden" }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View
        style={{ height: 3, width: `${pct}%` as `${number}%`, backgroundColor: C.accent }}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [s.primary, off && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={C.onAccent} />
      ) : (
        <Text style={s.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.secondary, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
    >
      <Text style={s.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={s.textBtn}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon && <Ionicons name={icon} size={16} color={C.accent} />}
      <Text style={s.action}>{label}</Text>
    </Pressable>
  );
}

/** One sentence, one action, a simple symbol */
export function EmptyState({
  icon = "receipt-outline",
  text,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={32} color={C.textSecondary} />
      <Text style={s.emptyText}>{text}</Text>
      {actionLabel && onAction && <SecondaryButton label={actionLabel} onPress={onAction} />}
    </View>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    pageHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    pageHeaderText: { flex: 1, gap: 4 },
    pageTitle: { ...type.title, color: C.textPrimary },
    pageSubtitle: { ...type.meta, color: C.textSecondary },
    sectionHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: { ...type.section, color: C.textPrimary },
    meta: { ...type.meta, color: C.textSecondary },
    action: { fontSize: 15, fontWeight: "600", color: C.accent },
    day: { ...type.meta, fontWeight: "600", color: C.textSecondary },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.surface,
    },
    chipOn: { backgroundColor: C.accent, borderColor: C.accent },
    chipDashed: { borderStyle: "dashed", borderColor: C.textSecondary, backgroundColor: "transparent" },
    chipText: { fontSize: 14, fontWeight: "500", color: C.textPrimary },
    primary: {
      minHeight: 50,
      borderRadius: radius.control,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    primaryText: { fontSize: 17, fontWeight: "600", color: C.onAccent },
    secondary: {
      minHeight: 44,
      borderRadius: radius.control,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    secondaryText: { fontSize: 16, fontWeight: "500", color: C.textPrimary },
    textBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    empty: { alignItems: "center", gap: 12, paddingVertical: 32, paddingHorizontal: 16 },
    emptyText: { ...type.body, color: C.textSecondary, textAlign: "center" },
  });
