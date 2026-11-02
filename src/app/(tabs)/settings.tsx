import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AccountCard from "../../lib/AccountCard";
import RecurringEntrySheet from "../../lib/RecurringEntrySheet";
import {
  CURRENCIES,
  Palette,
  confirmAction,
  confirmChange,
  entryDate,
  entryLabel,
  showDate,
  useBudget
} from "../../lib/budget";
import type { Entry, RecurringFrequency, RecurringRule } from "../../lib/budget";
import CategoriesRow from "../../lib/CategoriesRow";
import SecurityCard from "../../lib/SecurityCard";
import { SCREEN_INSET } from "../../lib/theme";
import { PageHeader } from "../../lib/ui";

const THEMES = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
] as const;

export default function Settings() {
  const {
    currency,
    setCurrency,
    theme,
    setTheme,
    entries,
    clearAll,
    colors: C,
    isDark,
    syncStatus,
    retrySync,
    recurringRules,
    addRecurringRule,
    updateRecurringRule,
    stopRecurringRule,
    tagMap,
    money,
  } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entryPickerOpen, setEntryPickerOpen] = useState(false);
  const [recurringEntry, setRecurringEntry] = useState<Entry | null>(null);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const entriesWithoutSchedule = useMemo(
    () => entries.filter((entry) => !entry.recurringId),
    [entries]
  );

  const current = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  // Matches name, country, code, or symbol
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [query]);

  const closePicker = () => {
    setPickerOpen(false);
    setQuery("");
  };

  const closeRecurringSheet = () => {
    setRecurringEntry(null);
    setEditingRule(null);
  };

  const startEditingRule = (rule: RecurringRule) => {
    const source = entries.find((entry) => entry.id === rule.sourceEntryId);
    setRecurringEntry(
      source ?? {
        id: rule.sourceEntryId,
        type: rule.type,
        title: rule.title,
        amount: rule.amount,
        createdAt: new Date(`${rule.startDate}T${rule.time}:00`).getTime(),
        date: rule.startDate,
        time: rule.time,
        tagId: rule.tagId,
        recurringId: rule.id,
      }
    );
    setEditingRule(rule);
  };

  const saveRecurringRule = (frequency: RecurringFrequency, endDate?: string) => {
    if (!recurringEntry) return;
    if (editingRule) updateRecurringRule(editingRule.id, frequency, endDate);
    else addRecurringRule(recurringEntry, frequency, endDate);
    closeRecurringSheet();
  };

  const pickCurrency = (code: string) => {
    closePicker();
    if (code === currency) return;
    const c = CURRENCIES.find((x) => x.code === code);
    if (!c) return;
    // Wait for the sheet to close so the prompt shows on top
    setTimeout(() => {
      confirmChange(
        "Change currency?",
        `Switch to ${c.name} (${c.code})? Amounts you already entered won't be converted.`,
        "Change",
        () => setCurrency(code)
      );
    }, 350);
  };

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingHorizontal: SCREEN_INSET,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <PageHeader
          title="Settings"
          subtitle="Appearance applies instantly. Other changes ask first."
          style={s.pageHeader}
        />
        <AccountCard />

        <View style={s.card}>
          <Text style={s.cardTitle}>Appearance</Text>
          <View style={s.segment}>
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTheme(t.key)}
                  style={[s.segBtn, active && s.segBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={t.icon} size={18} color={active ? C.onInk : C.ink} />
                  <Text style={[s.segText, active && { color: C.onInk }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Currency</Text>
          <Pressable
            style={s.currencyField}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
          >
            <Text style={s.flag}>{current.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.currencyName}>{current.name}</Text>
              <Text style={s.currencySub}>
                {current.country}, {current.code}
              </Text>
            </View>
            <Text style={s.symbol}>{current.symbol.trim()}</Text>
            <Ionicons name="chevron-down" size={20} color={C.muted} />
          </Pressable>
        </View>

        <CategoriesRow />
        <SecurityCard />

        <View style={s.card}>
          <View style={s.recurringHeading}>
            <Text style={s.cardTitle}>Recurring transactions</Text>
            <Pressable
              style={s.addSchedule}
              onPress={() => setEntryPickerOpen(true)}
              accessibilityRole="button"
              disabled={entriesWithoutSchedule.length === 0}
            >
              <Ionicons name="add" size={18} color={C.onAccent} />
              <Text style={s.addScheduleText}>Add</Text>
            </Pressable>
          </View>
          {recurringRules.length === 0 ? (
            <Text style={s.note}>No recurring transactions yet.</Text>
          ) : (
            recurringRules.map((rule) => (
              <View key={rule.id} style={s.recurringRow}>
                <View style={s.recurringInfo}>
                  <Text style={s.recurringTitle} numberOfLines={1}>
                    {rule.title.trim() ||
                      (rule.tagId ? tagMap.get(rule.tagId)?.name : undefined) ||
                      (rule.type === "income" ? "Income" : "Expense")}
                  </Text>
                  <Text style={s.recurringDetail}>
                    {money(rule.amount)} · {rule.frequency} · Next {showDate(rule.nextDate)}
                  </Text>
                </View>
                <Pressable
                  style={s.iconAction}
                  onPress={() => startEditingRule(rule)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${rule.title || "recurring transaction"}`}
                  hitSlop={4}
                >
                  <Ionicons name="create-outline" size={20} color={C.accent} />
                </Pressable>
                <Pressable
                  style={s.iconAction}
                  onPress={() =>
                    confirmAction(
                      "Stop recurring transaction?",
                      "Future transactions will no longer be added. Existing transactions will remain.",
                      "Stop",
                      () => stopRecurringRule(rule.id)
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Stop ${rule.title || "recurring transaction"}`}
                  hitSlop={4}
                >
                  <Ionicons name="trash-outline" size={20} color={C.expense} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Your data</Text>
          <Text style={s.note}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"} saved.{" "}
            {syncStatus === "synced"
              ? "Your budget is synced to your account."
              : syncStatus === "syncing"
                ? "Syncing your budget to your account..."
                : syncStatus === "error"
                  ? "Couldn't sync. Your data is still saved on this device."
                  : "Cloud sync is unavailable. Your data is saved on this device."}
          </Text>
          {syncStatus !== "notConnected" && (
            <Pressable
              style={s.syncAction}
              onPress={() => void retrySync()}
              disabled={syncStatus === "syncing"}
              accessibilityRole="button"
              accessibilityState={{ disabled: syncStatus === "syncing" }}
            >
              <Ionicons name="refresh-outline" size={18} color={C.accent} />
              <Text style={s.syncActionText}>
                {syncStatus === "error" ? "Refresh and retry sync" : "Refresh from cloud"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={s.dangerBtn}
            onPress={() =>
              confirmAction(
                "Delete all budget data",
                "This removes every entry and recurring schedule. This can't be undone.",
                "Delete all data",
                clearAll
              )
            }
          >
            <Ionicons name="trash-outline" size={18} color={C.expense} />
            <Text style={s.dangerText}>Delete all budget data</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={s.backdrop} onPress={closePicker}>
            <Pressable style={s.sheet} onPress={() => {}}>
              <View style={s.grabber} />
              <View style={s.sheetHead}>
                <Text style={s.sheetTitle}>Choose currency</Text>
                <Pressable onPress={closePicker} hitSlop={12} accessibilityLabel="Close">
                  <Ionicons name="close" size={26} color={C.muted} />
                </Pressable>
              </View>

              <View style={s.search}>
                <Ionicons name="search" size={20} color={C.muted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search currency, country, or code"
                  placeholderTextColor={C.muted}
                  keyboardAppearance={isDark ? "dark" : "light"}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
                    <Ionicons name="close-circle" size={20} color={C.muted} />
                  </Pressable>
                )}
              </View>

              <FlatList
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                data={results}
                keyExtractor={(c) => c.code}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                  <View style={s.emptyWrap}>
                    <Ionicons name="search-outline" size={36} color={C.muted} />
                    <Text style={s.emptyText}>No currency found for “{query.trim()}”.</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const active = item.code === currency;
                  return (
                    <Pressable
                      onPress={() => pickCurrency(item.code)}
                      style={[s.currencyRow, active && { backgroundColor: C.highlight }]}
                    >
                      <Text style={s.flag}>{item.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.currencyName}>{item.name}</Text>
                        <Text style={s.currencySub}>
                          {item.country}, {item.code}
                        </Text>
                      </View>
                      <Text style={s.symbol}>{item.symbol.trim()}</Text>
                      {active && (
                        <Ionicons name="checkmark-circle" size={24} color={C.income} />
                      )}
                    </Pressable>
                  );
                }}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={entryPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEntryPickerOpen(false)}
      >
        <Pressable
          style={s.entryPickerBackdrop}
          onPress={() => setEntryPickerOpen(false)}
        >
          <Pressable style={s.entryPickerSheet} onPress={() => {}}>
            <View style={s.grabber} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Choose a transaction</Text>
              <Pressable
                onPress={() => setEntryPickerOpen(false)}
                hitSlop={12}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={26} color={C.muted} />
              </Pressable>
            </View>
            <Text style={s.note}>Choose an existing transaction to repeat.</Text>
            <ScrollView>
              {entriesWithoutSchedule.map((entry) => (
                <Pressable
                  key={entry.id}
                  style={s.entryChoice}
                  onPress={() => {
                    setRecurringEntry(entry);
                    setEditingRule(null);
                    setEntryPickerOpen(false);
                  }}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.recurringTitle} numberOfLines={1}>
                      {entryLabel(entry, tagMap)}
                    </Text>
                    <Text style={s.recurringDetail}>{showDate(entryDate(entry))}</Text>
                  </View>
                  <Text style={s.entryAmount}>{money(entry.amount)}</Text>
                </Pressable>
              ))}
              {entriesWithoutSchedule.length === 0 && (
                <Text style={s.note}>
                  Add a transaction first, then you can create a recurring schedule for it.
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      {recurringEntry && (
        <RecurringEntrySheet
          key={editingRule?.id ?? `new-${recurringEntry.id}`}
          visible
          entry={recurringEntry}
          initialFrequency={editingRule?.frequency}
          initialEndDate={editingRule?.endDate}
          title={editingRule ? "Edit recurring schedule" : undefined}
          saveLabel={editingRule ? "Save changes" : undefined}
          onClose={closeRecurringSheet}
          onSave={saveRecurringRule}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) => {
  const shadow = {
    shadowColor: "#101B26",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    pageHeader: { marginBottom: 20 },
    card: {
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 18,
      gap: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.line,
      ...shadow,
    },
    cardTitle: { fontSize: 17, fontWeight: "700", color: C.ink },
    note: { fontSize: 15, color: C.muted, lineHeight: 22 },
    recurringHeading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    addSchedule: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: C.accent,
    },
    addScheduleText: { color: C.onAccent, fontSize: 14, fontWeight: "600" },
    recurringRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    recurringInfo: { flex: 1, gap: 3 },
    recurringTitle: { fontSize: 15, fontWeight: "600", color: C.ink },
    recurringDetail: { fontSize: 13, lineHeight: 18, color: C.muted },
    iconAction: {
      width: 40,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    entryPickerBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.6)",
    },
    entryPickerSheet: {
      height: "70%",
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: C.line,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    entryChoice: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    entryAmount: { fontSize: 15, fontWeight: "600", color: C.ink },
    syncAction: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.line,
    },
    syncActionText: { fontSize: 15, fontWeight: "600", color: C.accent },
    segment: {
      flexDirection: "row",
      backgroundColor: C.bg,
      borderRadius: 14,
      padding: 4,
      gap: 4,
      borderWidth: 1,
      borderColor: C.line,
    },
    segBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
    },
    segBtnActive: { backgroundColor: C.ink },
    segText: { fontSize: 15, fontWeight: "700", color: C.ink },
    currencyField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    currencyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    flag: { fontSize: 28 },
    currencyName: { fontSize: 17, fontWeight: "600", color: C.ink },
    currencySub: { fontSize: 13, color: C.muted, marginTop: 2 },
    symbol: { fontSize: 19, fontWeight: "700", color: C.ink, minWidth: 34, textAlign: "right" },
    dangerBtn: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.expense,
      alignItems: "center",
      justifyContent: "center",
    },
    dangerText: { color: C.expense, fontWeight: "700", fontSize: 16 },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    sheet: {
      height: "80%",
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: C.line,
      paddingBottom: 20,
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.muted,
      opacity: 0.6,
      marginTop: 10,
    },
    sheetHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 12,
    },
    sheetTitle: { fontSize: 19, fontWeight: "700", color: C.ink },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 14,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      height: 48,
    },
    searchInput: { flex: 1, fontSize: 17, color: C.ink, height: 48 },
    emptyWrap: { alignItems: "center", gap: 10, paddingVertical: 40, paddingHorizontal: 20 },
    emptyText: { fontSize: 15, color: C.muted, textAlign: "center" },
  });
};