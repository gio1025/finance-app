import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { memo, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { DateField, TimeField } from "./Pickers";
import RecurringEntrySheet from "./RecurringEntrySheet";
import {
  Entry,
  Palette,
  entryDate,
  parseAmount,
  toDateStr,
  toTimeStr,
  useBudget,
} from "./budget";
import type { RecurringFrequency } from "./budget";
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
    updateEntry,
    tags,
    tagMap,
    symbol,
    colors: C,
    isDark,
  } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();

  const [type, setType] = useState<Entry["type"]>(editing?.type ?? "expense");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [amount, setAmount] = useState(editing ? formatAmountInput(String(editing.amount)) : "");
  const [tagId, setTagId] = useState<string | undefined>(editing?.tagId);
  const [date, setDate] = useState(editing ? entryDate(editing) : toDateStr(new Date()));
  const [time, setTime] = useState(
    editing ? editing.time ?? toTimeStr(new Date(editing.createdAt)) : toTimeStr(new Date())
  );
  const [recurringDraft, setRecurringDraft] = useState<Entry | null>(null);

  const keyboard = isDark ? "dark" : "light";
  const tagsForType = useMemo(() => tags.filter((t) => t.kind === type), [tags, type]);

  const value = parseAmount(amount);
  const amountValid = value > 0;
  // Only complain once something has been typed
  const amountError = amount.length > 0 && !amountValid ? "Enter an amount above 0" : "";

  const changeType = (t: Entry["type"]) => {
    setType(t);
    // A category only belongs to one type
    if (tagId && tagMap.get(tagId)?.kind !== t) setTagId(undefined);
  };

  const setNow = () => {
    const n = new Date();
    setDate(toDateStr(n));
    setTime(toTimeStr(n));
  };

  const save = () => {
    if (!amountValid) return;
    const input = { type, title: title.trim(), amount: value, date, time, tagId };
    if (editing) updateEntry(editing.id, input);
    else addEntry(input);
    haptics.success();
    onDone();
  };

  const configureRepeat = () => {
    if (!amountValid) return;
    setRecurringDraft({
      id: "draft",
      type,
      title: title.trim(),
      amount: value,
      createdAt: new Date(`${date}T${time}:00`).getTime(),
      date,
      time,
      tagId,
    });
  };

  const saveRecurring = (frequency: RecurringFrequency, endDate?: string) => {
    if (!amountValid) return;
    const entry = addEntry({ type, title: title.trim(), amount: value, date, time, tagId });
    addRecurringRule(entry, frequency, endDate);
    haptics.success();
    setRecurringDraft(null);
    onDone();
  };

  return (
    <View style={s.form}>
      <View style={s.chipRow}>
        <Chip label="Expense" selected={type === "expense"} onPress={() => changeType("expense")} />
        <Chip label="Income" selected={type === "income"} onPress={() => changeType("income")} />
      </View>

      {/* The amount is the screen */}
      <View>
        <View style={s.amountRow}>
          <Text style={s.symbol}>{symbol}</Text>
          <TextInput
            style={s.amountInput}
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
        <Text style={s.label}>{type === "income" ? "Source" : "Description"} (optional)</Text>
        <TextInput
          style={s.input}
          placeholder={type === "income" ? "e.g. October salary" : "e.g. Lunch with friends"}
          placeholderTextColor={C.textTertiary}
          keyboardAppearance={keyboard}
          selectionColor={C.accent}
          returnKeyType="done"
          maxLength={60}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={s.field}>
        <Text style={s.label}>Category (optional)</Text>
        {/* One line that scrolls sideways */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={s.catContent}
        >
          {tagsForType.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              selected={tagId === t.id}
              onPress={() => setTagId(tagId === t.id ? undefined : t.id)}
            />
          ))}
          <Chip
            dashed
            icon="add-outline"
            label={tagsForType.length === 0 ? "Add category" : "New"}
            onPress={() => router.push("/categories")}
          />
        </ScrollView>
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
    catContent: { gap: 8, alignItems: "center", paddingVertical: 2 },
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