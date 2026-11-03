import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AccountCard from "../../lib/AccountCard";
import { useAuth } from "../../lib/auth/AuthContext";
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
import type {
  Entry,
  RecurringFrequency,
  RecurringRule,
  SavedDescription,
  SavedDescriptionType,
} from "../../lib/budget";
import SecurityCard from "../../lib/SecurityCard";
import { NavItem, useNavigationPreferences } from "../../lib/navigationPreferences";
import { SCREEN_INSET } from "../../lib/theme";
import { PageHeader } from "../../lib/ui";

const THEMES = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
] as const;
const NAV_LABELS: Record<NavItem, string> = {
  index: "Home",
  transactions: "Activity",
  add: "Add transaction",
  settings: "Settings",
};

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
    savedDescriptions,
    addSavedDescription,
    updateSavedDescription,
    deleteSavedDescription,
    tagMap,
    money,
  } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { order: navOrder, move: moveNavItem } = useNavigationPreferences();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 900;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entryPickerOpen, setEntryPickerOpen] = useState(false);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [descriptionsOpen, setDescriptionsOpen] = useState(false);
  const [navOrderOpen, setNavOrderOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState<SavedDescription | null>(null);
  const [descriptionName, setDescriptionName] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [descriptionType, setDescriptionType] = useState<SavedDescriptionType>("expense");
  const [descriptionListType, setDescriptionListType] = useState<"income" | "expense">("expense");
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

  const beginAddDescription = () => {
    setEditingDescription({ id: "", name: "", type: descriptionListType });
    setDescriptionName("");
    setDescriptionError("");
    setDescriptionType(descriptionListType);
  };

  const beginEditDescription = (description: SavedDescription) => {
    setEditingDescription(description);
    setDescriptionName(description.name);
    setDescriptionError("");
    setDescriptionType(description.type);
  };

  const cancelDescriptionEdit = () => {
    setEditingDescription(null);
    setDescriptionName("");
    setDescriptionError("");
  };

  const saveDescription = () => {
    const name = descriptionName.trim();
    if (!name) {
      setDescriptionError("Enter a description.");
      return;
    }
    if (
      savedDescriptions.some(
        (description) =>
          description.id !== editingDescription?.id &&
          description.name.toLocaleLowerCase() === name.toLocaleLowerCase() &&
          (description.type === descriptionType ||
            description.type === "both" ||
            descriptionType === "both")
      )
    ) {
      setDescriptionError("That saved description already exists.");
      return;
    }
    if (editingDescription?.id) updateSavedDescription(editingDescription.id, name, descriptionType);
    else addSavedDescription(name, descriptionType);
    cancelDescriptionEdit();
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
        contentContainerStyle={[s.scroll, desktop && s.desktopScroll, {
          paddingHorizontal: SCREEN_INSET,
          paddingTop: 24,
          paddingBottom: 40,
        }]}
      >
        <PageHeader
          title="Settings"
          subtitle="Appearance applies instantly. Other changes ask first."
          style={s.pageHeader}
        />
        <AccountCard />
        {!user && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Guest mode</Text>
            <Text style={s.note}>Your budget is saved on this device. Log out to return to the welcome screen.</Text>
            <Pressable
              style={s.guestLogout}
              onPress={() => confirmChange(
                "Log out of guest mode?",
                "Your budget will stay saved on this device. You can continue as a guest again any time.",
                "Log out",
                () => { void signOut(); }
              )}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={19} color={C.ink} />
              <Text style={s.guestLogoutText}>Log out</Text>
            </Pressable>
          </View>
        )}

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

        <Pressable
          style={s.manageRow}
          onPress={() => setDescriptionsOpen(true)}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Saved descriptions</Text>
            <Text style={s.note}>
            {savedDescriptions.length} saved · Separate suggestions for income and expenses.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.muted} />
        </Pressable>

        <Pressable
          style={s.manageRow}
          onPress={() => setNavOrderOpen(true)}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Navigation order</Text>
            <Text style={s.note}>Choose the order of tabs on your device.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.muted} />
        </Pressable>

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

        <SecurityCard />

        <View style={s.card}>
          <View style={s.recurringHeading}>
            <Text style={s.cardTitle}>Recurring transactions</Text>
            <Pressable
              style={s.addSchedule}
              onPress={() =>
                recurringRules.length > 0
                  ? setSchedulePickerOpen(true)
                  : setEntryPickerOpen(true)
              }
              accessibilityRole="button"
              accessibilityLabel={recurringRules.length > 0 ? "Edit recurring transaction" : "Add recurring transaction"}
              disabled={recurringRules.length === 0 && entriesWithoutSchedule.length === 0}
            >
              <Ionicons
                name={recurringRules.length > 0 ? "create-outline" : "add"}
                size={18}
                color={C.onAccent}
              />
              <Text style={s.addScheduleText}>{recurringRules.length > 0 ? "Edit" : "Add"}</Text>
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

        <Pressable
          style={s.manageRow}
          onPress={() => router.push("/about")}
          accessibilityRole="button"
        >
          <View style={s.aboutRowIcon}>
            <Ionicons name="information-circle-outline" size={22} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>About</Text>
            <Text style={s.note}>App details, links, and privacy.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.muted} />
        </Pressable>
      </ScrollView>

      <Modal
        visible={navOrderOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNavOrderOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setNavOrderOpen(false)}>
          <Pressable style={s.entryPickerSheet} onPress={() => {}}>
            <View style={s.grabber} />
            <View style={s.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Navigation order</Text>
                <Text style={s.descriptionSubtitle}>Choose the order of tabs on your device.</Text>
              </View>
              <Pressable
                onPress={() => setNavOrderOpen(false)}
                hitSlop={12}
                accessibilityLabel="Close navigation order"
              >
                <Ionicons name="close" size={26} color={C.muted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.navOrderSheetList}>
              {navOrder.map((item, index) => (
                <View key={item} style={s.navOrderRow}>
                  <Text style={s.navOrderName}>{index + 1}. {NAV_LABELS[item]}</Text>
                  <View style={s.navOrderActions}>
                    <Pressable
                      style={[s.navMoveButton, index === 0 && s.navMoveDisabled]}
                      onPress={() => moveNavItem(item, -1)}
                      disabled={index === 0}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${NAV_LABELS[item]} earlier`}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={index === 0 ? C.muted : C.ink}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        s.navMoveButton,
                        index === navOrder.length - 1 && s.navMoveDisabled,
                      ]}
                      onPress={() => moveNavItem(item, 1)}
                      disabled={index === navOrder.length - 1}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${NAV_LABELS[item]} later`}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={index === navOrder.length - 1 ? C.muted : C.ink}
                      />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
        visible={descriptionsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDescriptionsOpen(false);
          cancelDescriptionEdit();
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={s.backdrop}
            onPress={() => {
              setDescriptionsOpen(false);
              cancelDescriptionEdit();
            }}
          >
            <Pressable style={s.descriptionSheet} onPress={() => {}}>
              <View style={s.grabber} />
              <View style={s.sheetHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>Saved descriptions</Text>
                  <Text style={s.descriptionSubtitle}>
                    Reusable suggestions for new transactions.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setDescriptionsOpen(false);
                    cancelDescriptionEdit();
                  }}
                  hitSlop={12}
                  accessibilityLabel="Close saved descriptions"
                >
                  <Ionicons name="close" size={26} color={C.muted} />
                </Pressable>
              </View>
              {editingDescription ? (
                <View style={s.descriptionEditor}>
                  <Text style={s.descriptionEditorTitle}>
                    {editingDescription.id ? "Edit description" : "New description"}
                  </Text>
                  <View style={s.segment}>
                    {(
                      [
                        { value: "expense", label: "Expense" },
                        { value: "income", label: "Income" },
                        ...(editingDescription.id && editingDescription.type === "both"
                          ? [{ value: "both" as const, label: "Both" }]
                          : []),
                      ] as { value: SavedDescriptionType; label: string }[]
                    ).map((option) => {
                      const selected = descriptionType === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[s.segBtn, selected && s.segBtnActive]}
                          onPress={() => setDescriptionType(option.value)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text style={[s.segText, selected && { color: C.onInk }]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    style={s.descriptionInput}
                    value={descriptionName}
                    onChangeText={(value) => {
                      setDescriptionName(value);
                      setDescriptionError("");
                    }}
                    placeholder="e.g. Coffee"
                    placeholderTextColor={C.muted}
                    keyboardAppearance={isDark ? "dark" : "light"}
                    maxLength={60}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveDescription}
                    accessibilityLabel="Saved description"
                  />
                  {!!descriptionError && (
                    <Text style={s.descriptionError}>{descriptionError}</Text>
                  )}
                  <View style={s.descriptionActions}>
                    <Pressable
                      style={s.descriptionCancel}
                      onPress={cancelDescriptionEdit}
                      accessibilityRole="button"
                    >
                      <Text style={s.descriptionCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={s.descriptionSave}
                      onPress={saveDescription}
                      accessibilityRole="button"
                    >
                      <Text style={s.descriptionSaveText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={s.descriptionAdd}
                  onPress={beginAddDescription}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={20} color={C.onAccent} />
                  <Text style={s.descriptionAddText}>Add description</Text>
                </Pressable>
              )}
              <View style={s.segment}>
                {(["expense", "income"] as const).map((kind) => {
                  const selected = descriptionListType === kind;
                  return (
                    <Pressable
                      key={kind}
                      style={[s.segBtn, selected && s.segBtnActive]}
                      onPress={() => {
                        setDescriptionListType(kind);
                        if (!editingDescription) setDescriptionType(kind);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[s.segText, selected && { color: C.onInk }]}>
                        {kind === "expense" ? "Expenses" : "Income"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <ScrollView
                style={s.descriptionList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {savedDescriptions.filter(
                  (description) =>
                    description.type === descriptionListType || description.type === "both"
                ).length === 0 ? (
                  <Text style={s.descriptionEmpty}>
                    No saved {descriptionListType} descriptions yet. Add one to get started.
                  </Text>
                ) : (
                  savedDescriptions
                    .filter(
                      (description) =>
                        description.type === descriptionListType || description.type === "both"
                    )
                    .map((description) => (
                    <View key={description.id} style={s.descriptionRow}>
                      <Text style={s.descriptionName} numberOfLines={2}>
                        {description.name}
                      </Text>
                      <Pressable
                        style={s.descriptionIcon}
                        onPress={() => beginEditDescription(description)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${description.name}`}
                      >
                        <Ionicons name="create-outline" size={20} color={C.accent} />
                      </Pressable>
                      <Pressable
                        style={s.descriptionIcon}
                        onPress={() =>
                          confirmAction(
                            "Delete saved description?",
                            `“${description.name}” will no longer appear as a suggestion. Existing transactions won't change.`,
                            "Delete",
                            () => deleteSavedDescription(description.id)
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${description.name}`}
                      >
                        <Ionicons name="trash-outline" size={20} color={C.expense} />
                      </Pressable>
                    </View>
                    ))
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={schedulePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSchedulePickerOpen(false)}
      >
        <Pressable
          style={s.entryPickerBackdrop}
          onPress={() => setSchedulePickerOpen(false)}
        >
          <Pressable style={s.entryPickerSheet} onPress={() => {}}>
            <View style={s.grabber} />
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Choose a schedule to edit</Text>
              <Pressable
                onPress={() => setSchedulePickerOpen(false)}
                hitSlop={12}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={26} color={C.muted} />
              </Pressable>
            </View>
            <ScrollView>
              {recurringRules.map((rule) => (
                <Pressable
                  key={rule.id}
                  style={s.entryChoice}
                  onPress={() => {
                    setSchedulePickerOpen(false);
                    startEditingRule(rule);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${rule.title || "recurring transaction"}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.recurringTitle} numberOfLines={1}>
                      {rule.title.trim() ||
                        (rule.tagId ? tagMap.get(rule.tagId)?.name : undefined) ||
                        (rule.type === "income" ? "Income" : "Expense")}
                    </Text>
                    <Text style={s.recurringDetail}>
                      {rule.frequency} · Next {showDate(rule.nextDate)}
                    </Text>
                  </View>
                  <Text style={s.entryAmount}>{money(rule.amount)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {entriesWithoutSchedule.length > 0 && (
              <Pressable
                style={s.addAnotherSchedule}
                onPress={() => {
                  setSchedulePickerOpen(false);
                  setEntryPickerOpen(true);
                }}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color={C.accent} />
                <Text style={s.addAnotherScheduleText}>Add another recurring transaction</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
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
    scroll: { width: "100%" },
    desktopScroll: { maxWidth: 880, alignSelf: "center" },
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
    guestLogout: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      backgroundColor: C.highlight,
    },
    guestLogoutText: { color: C.ink, fontSize: 15, fontWeight: "700" },
    manageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.line,
      ...shadow,
    },
    aboutRowIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: C.highlight,
    },
    navOrderRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.line,
    },
    navOrderSheetList: { paddingHorizontal: 20, paddingBottom: 16 },
    navOrderName: { flex: 1, fontSize: 15, color: C.ink, fontWeight: "500" },
    navOrderActions: { flexDirection: "row", gap: 4 },
    navMoveButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: C.bg,
    },
    navMoveDisabled: { opacity: 0.45 },
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
    addAnotherSchedule: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    addAnotherScheduleText: { fontSize: 14, fontWeight: "600", color: C.accent },
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
    descriptionSheet: {
      height: "72%",
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: C.line,
      paddingBottom: 20,
    },
    descriptionSubtitle: { marginTop: 3, fontSize: 13, color: C.muted },
    descriptionAdd: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: C.accent,
    },
    descriptionAddText: { color: C.onAccent, fontSize: 14, fontWeight: "700" },
    descriptionEditor: {
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 14,
      backgroundColor: C.bg,
    },
    descriptionEditorTitle: { fontSize: 15, fontWeight: "700", color: C.ink },
    descriptionInput: {
      minHeight: 46,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.line,
      color: C.ink,
      backgroundColor: C.card,
      fontSize: 15,
    },
    descriptionError: { color: C.expense, fontSize: 13 },
    descriptionActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
    descriptionCancel: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14 },
    descriptionCancelText: { color: C.muted, fontWeight: "600" },
    descriptionSave: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: C.accent,
    },
    descriptionSaveText: { color: C.onAccent, fontWeight: "700" },
    descriptionList: { paddingHorizontal: 20 },
    descriptionEmpty: { paddingVertical: 18, color: C.muted, fontSize: 14, textAlign: "center" },
    descriptionRow: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.line,
    },
    descriptionName: { flex: 1, fontSize: 15, fontWeight: "500", color: C.ink },
    descriptionIcon: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
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
