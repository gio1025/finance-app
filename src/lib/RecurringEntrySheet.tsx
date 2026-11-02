import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DateField } from "./Pickers";
import { Entry, Palette, RecurringFrequency, showDate, toDateStr, useBudget } from "./budget";
import { firstRecurringDate } from "./recurrence";
import { radius } from "./theme";

const frequencies: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringEntrySheet({
  visible,
  entry,
  onClose,
  onSave,
  initialFrequency = "monthly",
  initialEndDate,
  title = "Make it recurring",
  saveLabel = "Start recurring",
}: {
  visible: boolean;
  entry: Entry;
  onClose: () => void;
  onSave: (frequency: RecurringFrequency, endDate?: string) => void;
  initialFrequency?: RecurringFrequency;
  initialEndDate?: string;
  title?: string;
  saveLabel?: string;
}) {
  const { colors: C, money } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const [frequency, setFrequency] = useState<RecurringFrequency>(initialFrequency);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);
  const startDate = entry.date ?? toDateStr(new Date(entry.createdAt));
  const nextDate = firstRecurringDate(startDate, frequency, toDateStr(new Date()));
  const invalidEndDate = !!endDate && endDate < nextDate;
  const label = entry.title.trim() || (entry.type === "income" ? "Income" : "Expense");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close recurring transaction setup"
        />
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.grabber} />
          <View style={s.heading}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{title}</Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {label} · {money(entry.amount)}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={s.close}
            >
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            <Text style={s.label}>Repeat</Text>
            <View style={s.frequencyGrid}>
              {frequencies.map((option) => {
                const selected = frequency === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setFrequency(option.value)}
                    style={[s.frequency, selected && s.frequencySelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[s.frequencyText, selected && s.frequencyTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.nextCard}>
              <Ionicons name="calendar-outline" size={20} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.nextLabel}>Next transaction</Text>
                <Text style={s.nextDate}>{showDate(nextDate)}</Text>
              </View>
            </View>

            <Text style={s.label}>End</Text>
            <View style={s.endOptions}>
              <Pressable
                onPress={() => setEndDate(undefined)}
                style={[s.endOption, !endDate && s.endOptionSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: !endDate }}
              >
                <Text style={[s.endText, !endDate && s.endTextSelected]}>No end date</Text>
              </Pressable>
              <Pressable
                onPress={() => setEndDate((current) => current ?? nextDate)}
                style={[s.endOption, endDate && s.endOptionSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: !!endDate }}
              >
                <Text style={[s.endText, endDate && s.endTextSelected]}>Choose date</Text>
              </Pressable>
            </View>
            {endDate && (
              <DateField value={endDate} onChange={setEndDate} />
            )}
            {invalidEndDate && (
              <Text style={s.error}>End date must be on or after {showDate(nextDate)}.</Text>
            )}
          </ScrollView>

          <View style={s.actions}>
            <Pressable
              onPress={() => onSave(frequency, endDate)}
              disabled={invalidEndDate}
              style={({ pressed }) => [
                s.save,
                invalidEndDate && s.saveDisabled,
                pressed && !invalidEndDate && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: invalidEndDate }}
            >
              <Text style={s.saveText}>{saveLabel}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={s.cancel} accessibilityRole="button">
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    sheet: {
      maxHeight: "90%",
      paddingHorizontal: 24,
      paddingTop: 10,
      paddingBottom: 24,
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    grabber: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.hairline,
      marginBottom: 18,
    },
    heading: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    title: { fontSize: 20, fontWeight: "700", color: C.textPrimary },
    subtitle: { fontSize: 14, color: C.textSecondary, marginTop: 3 },
    close: {
      width: 40,
      height: 40,
      borderRadius: radius.control,
      alignItems: "center",
      justifyContent: "center",
    },
    content: { gap: 12, paddingBottom: 12 },
    label: { fontSize: 14, fontWeight: "600", color: C.textSecondary },
    frequencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    frequency: {
      minWidth: "47%",
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: C.hairline,
      alignItems: "center",
      justifyContent: "center",
    },
    frequencySelected: { backgroundColor: C.accent, borderColor: C.accent },
    frequencyText: { fontSize: 15, fontWeight: "500", color: C.textPrimary },
    frequencyTextSelected: { color: C.onAccent },
    nextCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginVertical: 4,
      borderRadius: radius.control,
      backgroundColor: C.fillSubtle,
    },
    nextLabel: { fontSize: 13, color: C.textSecondary },
    nextDate: { fontSize: 15, fontWeight: "600", color: C.textPrimary, marginTop: 2 },
    endOptions: { flexDirection: "row", gap: 8 },
    endOption: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: C.hairline,
      alignItems: "center",
      justifyContent: "center",
    },
    endOptionSelected: { borderColor: C.accent, backgroundColor: C.fillSubtle },
    endText: { fontSize: 14, fontWeight: "500", color: C.textPrimary },
    endTextSelected: { color: C.accent },
    error: { fontSize: 13, color: C.negative },
    actions: { gap: 8, paddingTop: 12 },
    save: {
      minHeight: 50,
      borderRadius: radius.control,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    saveDisabled: { opacity: 0.45 },
    saveText: { fontSize: 16, fontWeight: "600", color: C.onAccent },
    cancel: { minHeight: 42, alignItems: "center", justifyContent: "center" },
    cancelText: { fontSize: 15, fontWeight: "500", color: C.textSecondary },
  });
