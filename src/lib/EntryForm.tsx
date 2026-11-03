import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DateField, TimeField } from "./Pickers";
import RecurringEntrySheet from "./RecurringEntrySheet";
import type { RecurringFrequency } from "./budget";
import {
  Entry,
  Palette,
  entryDate,
  parseAmount,
  toDateStr,
  toTimeStr,
  useBudget,
} from "./budget";
import { haptics } from "./haptics";
import { radius, type } from "./theme";
import { Chip, Hairline, PrimaryButton, TextButton } from "./ui";

type Props = { editing: Entry | null; onDone: () => void };

function formatAmountInput(input: string) {
  const raw = input.replace(/[^\d.,]/g, "");
  const dot = raw.indexOf(".");
  const lastComma = raw.lastIndexOf(",");
  const commaDecimal =
    dot < 0 &&
    lastComma >= 0 &&
    raw.length - lastComma - 1 <= 2 &&
    raw.length - lastComma - 1 > 0 &&
    !/^(\d{1,3})(,\d{3})+$/.test(raw);
  const decimalIndex = dot >= 0 ? dot : commaDecimal ? lastComma : -1;
  const integer = raw
    .slice(0, decimalIndex < 0 ? raw.length : decimalIndex)
    .replace(/[,.]/g, "");
  const fraction =
    decimalIndex < 0 ? "" : raw.slice(decimalIndex + 1).replace(/[,.]/g, "");
  const hasDecimal = decimalIndex >= 0;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped || (hasDecimal ? "0" : "")}${hasDecimal ? `.${fraction}` : ""}`;
}

function EntryForm({ editing, onDone }: Props) {
  const {
    addEntry,
    addRecurringRule,
    addSavedDescription,
    updateEntry,
    tagMap,
    savedDescriptions,
    symbol,
    colors: C,
    isDark,
  } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);

  const [type, setType] = useState<Entry["type"]>(editing?.type ?? "expense");
  const [title, setTitle] = useState(
    editing
      ? [editing.title.trim(), editing.tagId ? tagMap.get(editing.tagId)?.name : ""]
          .filter(Boolean)
          .join(" · ")
      : ""
  );
  const [amount, setAmount] = useState(editing ? formatAmountInput(String(editing.amount)) : "");
  const [date, setDate] = useState(editing ? entryDate(editing) : toDateStr(new Date()));
  const [time, setTime] = useState(
    editing ? editing.time ?? toTimeStr(new Date(editing.createdAt)) : toTimeStr(new Date())
  );
  const [recurringDraft, setRecurringDraft] = useState<Entry | null>(null);
  const [descriptionError, setDescriptionError] = useState("");

  const keyboard = isDark ? "dark" : "light";
  const typeDescriptions = useMemo(
    () => savedDescriptions.filter((description) => description.type === type || description.type === "both"),
    [savedDescriptions, type]
  );
  const value = parseAmount(amount);
  const amountValid = value > 0;
  // Only complain once something has been typed
  const amountError = amount.length > 0 && !amountValid ? "Enter an amount above 0" : "";

  const setNow = () => {
    const n = new Date();
    setDate(toDateStr(n));
    setTime(toTimeStr(n));
  };

  const save = () => {
    if (!amountValid) return;
    if (!editing && !title.trim()) {
      setDescriptionError("Enter a description to continue.");
      return;
    }
    const input = { type, title: title.trim(), amount: value, date, time };
    if (editing) updateEntry(editing.id, input);
    else addEntry(input);
    haptics.success();
    onDone();
  };

  const configureRepeat = () => {
    if (!amountValid) return;
    if (!title.trim()) {
      setDescriptionError("Enter a description to continue.");
      return;
    }
    setRecurringDraft({
      id: "draft",
      type,
      title: title.trim(),
      amount: value,
      createdAt: new Date(`${date}T${time}:00`).getTime(),
      date,
      time,
    });
  };

  const saveRecurring = (frequency: RecurringFrequency, endDate?: string) => {
    if (!amountValid || !title.trim()) return;
    const entry = addEntry({ type, title: title.trim(), amount: value, date, time });
    addRecurringRule(entry, frequency, endDate);
    haptics.success();
    setRecurringDraft(null);
    onDone();
  };

  return (
    <View style={s.form}>
      <View style={s.chipRow}>
        <Chip label="Expense" selected={type === "expense"} onPress={() => setType("expense")} />
        <Chip label="Income" selected={type === "income"} onPress={() => setType("income")} />
      </View>

      {/* The amount is the screen */}
      <View>
        <View style={s.amountRow}>
          <Text style={s.symbol}>{symbol}</Text>
          <TextInput
            style={[s.amountInput, { color: type === "income" ? C.positive : C.negative }]}
            placeholder="0.00"
            placeholderTextColor={C.textTertiary}
            keyboardAppearance={keyboard}
            keyboardType="decimal-pad"
            selectionColor={C.accent}
            value={amount}
            onChangeText={(text) => setAmount(formatAmountInput(text))}
            accessibilityLabel="Amount"
          />
        </View>
        <Hairline />
        {!!amountError && <Text style={s.error}>{amountError}</Text>}
      </View>

      <View style={s.field}>
        <Text style={s.label}>{editing ? "Description" : "Description"}</Text>
        <TextInput
          style={[s.input, !!descriptionError && s.inputError]}
          placeholder={type === "income" ? "e.g. October salary" : "e.g. Lunch with friends"}
          placeholderTextColor={C.textTertiary}
          keyboardAppearance={keyboard}
          selectionColor={C.accent}
          returnKeyType="done"
          maxLength={60}
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (text.trim()) setDescriptionError("");
          }}
        />
        {!!descriptionError && <Text style={s.error}>{descriptionError}</Text>}
        {typeDescriptions.length > 0 && (
          <View style={s.savedDescriptions}>
            <Text style={s.savedDescriptionsLabel}>Saved descriptions</Text>
            <View style={s.savedDescriptionList}>
              {typeDescriptions.map((description) => {
                const selected =
                  title.trim().toLocaleLowerCase() === description.name.toLocaleLowerCase();
                return (
                  <Pressable
                    key={description.id}
                    style={[s.savedDescriptionChip, selected && s.savedDescriptionChipSelected]}
                    onPress={() => {
                      setTitle(description.name);
                      setDescriptionError("");
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        s.savedDescriptionText,
                        selected && s.savedDescriptionTextSelected,
                      ]}
                    >
                      {description.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <View style={s.descriptionActions}>
          {!!title.trim() &&
            !savedDescriptions.some(
              (description) =>
                description.name.toLocaleLowerCase() === title.trim().toLocaleLowerCase() &&
                (description.type === type || description.type === "both")
            ) && (
              <Pressable
                style={s.savedButton}
                onPress={() => addSavedDescription(title, type)}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={17} color={C.accent} />
                <Text style={s.savedButtonText}>Save this</Text>
              </Pressable>
            )}
        </View>
      </View>

      <View style={s.field}>
        <View style={s.labelRow}>
          <Text style={s.label}>Date & time</Text>
          <TextButton label="Now" icon="time-outline" onPress={setNow} />
        </View>
        <View style={s.row2}>
          <View style={{ flex: 1.3 }}>
            <DateField value={date} onChange={setDate} />
          </View>
          <View style={{ flex: 1 }}>
            <TimeField value={time} onChange={setTime} />
          </View>
        </View>
      </View>

      {!editing && (
        <Pressable
          style={({ pressed }) => [s.repeatButton, pressed && s.repeatPressed]}
          onPress={configureRepeat}
          disabled={!amountValid}
          accessibilityRole="button"
          accessibilityState={{ disabled: !amountValid }}
        >
          <Ionicons name="repeat-outline" size={20} color={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={s.repeatTitle}>Set a repeat schedule</Text>
            <Text style={s.repeatSubtitle}>Automatically add future transactions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
        </Pressable>
      )}

      <View style={s.actions}>
        <PrimaryButton
          label={editing ? "Save changes" : "Add entry"}
          onPress={save}
          disabled={!amountValid}
        />
        {editing && (
          <View style={{ alignItems: "center" }}>
            <TextButton label="Cancel" onPress={onDone} />
          </View>
        )}
      </View>
      {recurringDraft && (
        <RecurringEntrySheet
          key={recurringDraft.id}
          visible
          entry={recurringDraft}
          onClose={() => setRecurringDraft(null)}
          onSave={saveRecurring}
        />
      )}
    </View>
  );
}

export default memo(EntryForm);

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    form: { gap: 20 },
    chipRow: { flexDirection: "row", gap: 8 },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    symbol: { fontSize: 24, fontWeight: "500", color: C.textSecondary },
    amountInput: {
      ...type.hero,
      flex: 1,
      minWidth: 0,
      color: C.textPrimary,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    error: { ...type.meta, color: C.negative, marginTop: 6 },
    field: { gap: 8 },
    label: { ...type.meta, fontWeight: "500", color: C.textSecondary },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    row2: { flexDirection: "row", gap: 12 },
    input: {
      ...type.body,
      minHeight: 52,
      paddingHorizontal: 16,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.surface,
      color: C.textPrimary,
    },
    inputError: { borderColor: C.negative },
    savedDescriptions: { gap: 8 },
    savedDescriptionsLabel: { ...type.meta, fontWeight: "500", color: C.textSecondary },
    savedDescriptionList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    savedDescriptionChip: {
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.surface,
    },
    savedDescriptionChipSelected: { borderColor: C.accent, backgroundColor: C.highlight },
    savedDescriptionText: { ...type.meta, color: C.textPrimary },
    savedDescriptionTextSelected: { color: C.accent, fontWeight: "600" },
    descriptionActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    savedButton: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    savedButtonText: { fontSize: 13, fontWeight: "600", color: C.accent },
    repeatButton: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.surface,
    },
    repeatPressed: { opacity: 0.75 },
    repeatTitle: { ...type.body, color: C.textPrimary, fontWeight: "600" },
    repeatSubtitle: { ...type.meta, color: C.textSecondary, marginTop: 2 },
    actions: { gap: 12, marginTop: 4 },
  });
