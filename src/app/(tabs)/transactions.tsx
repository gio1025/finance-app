import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SectionList,
  SectionListRenderItem,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntryActionsSheet from "../../lib/EntryActionsSheet";
import EntryRow from "../../lib/EntryRow";
import RecurringEntrySheet from "../../lib/RecurringEntrySheet";
import ActivityFilters from "../../lib/ActivityFilters";
import type { DatePreset } from "../../lib/ActivityFilters";
import { Entry, Palette, entryDate, toDateStr, useBudget } from "../../lib/budget";
import { SCREEN_INSET } from "../../lib/theme";
import {
  DayHeader,
  EmptyState,
  PageHeader,
  SectionHeader,
  groupByDay,
  useSpokenMoney,
} from "../../lib/ui";

type Section = { key: string; title: string; data: Entry[] };

export default function Transactions() {
  const {
    sorted,
    tagMap,
    savedDescriptions,
    money,
    recurringRules,
    addRecurringRule,
    stopRecurringRule,
    deleteEntry,
    colors: C,
  } = useBudget();
  const spoken = useSpokenMoney();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const [actionEntry, setActionEntry] = useState<Entry | null>(null);
  const [recurringEntry, setRecurringEntry] = useState<Entry | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [description, setDescription] = useState("");

  const dateRange = useMemo(() => {
    if (datePreset === "custom") return { from: fromDate, to: toDate };
    if (datePreset === "all") return { from: "", to: "" };
    const today = new Date();
    const todayStr = toDateStr(today);
    if (datePreset === "today") return { from: todayStr, to: todayStr };
    if (datePreset === "last7") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { from: toDateStr(start), to: todayStr };
    }
    if (datePreset === "thisMonth") {
      return { from: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayStr };
    }
    return {
      from: toDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: toDateStr(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }, [datePreset, fromDate, toDate]);
  const invalidDateRange =
    datePreset === "custom" && !!dateRange.from && !!dateRange.to && dateRange.from > dateRange.to;

  const filteredEntries = useMemo(
    () =>
      invalidDateRange
        ? []
        : sorted.filter((entry) => {
            const date = entryDate(entry);
            return (
              (!dateRange.from || date >= dateRange.from) &&
              (!dateRange.to || date <= dateRange.to) &&
              (typeFilter === "all" || entry.type === typeFilter) &&
              (!description.trim() ||
                entry.title.toLocaleLowerCase().includes(description.trim().toLocaleLowerCase()) ||
                (entry.tagId
                  ? (tagMap.get(entry.tagId)?.name ?? "")
                      .toLocaleLowerCase()
                      .includes(description.trim().toLocaleLowerCase())
                  : false))
            );
          }),
    [sorted, invalidDateRange, dateRange, typeFilter, description, tagMap]
  );
  const sections = useMemo(() => groupByDay(filteredEntries), [filteredEntries]);

  const count = filteredEntries.length;
  const recurringById = useMemo(
    () => new Map(recurringRules.map((rule) => [rule.id, rule])),
    [recurringRules]
  );
  const selectedRule = actionEntry?.recurringId
    ? recurringById.get(actionEntry.recurringId)
    : undefined;

  const remove = useCallback((e: Entry) => deleteEntry(e), [deleteEntry]);

  const renderItem: SectionListRenderItem<Entry, Section> = useCallback(
    ({ item }) => (
      <View style={s.inset}>
        <EntryRow
          item={item}
          tag={item.tagId ? tagMap.get(item.tagId) : undefined}
          recurrence={item.recurringId ? recurringById.get(item.recurringId)?.frequency : undefined}
          C={C}
          money={money}
          spoken={spoken}
          onMenu={setActionEntry}
        />
      </View>
    ),
    [C, money, spoken, tagMap, recurringById, s]
  );

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setDatePreset("all");
    setTypeFilter("all");
    setDescription("");
  };
  const header = (
    <View style={s.header}>
      <PageHeader
        title="Activity"
        subtitle="Review and filter your transactions."
        style={s.pageHeader}
        action={
          <Pressable
            style={s.addButton}
            onPress={() => router.push("/add")}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color={C.onAccent} />
            <Text style={s.addButtonText}>Add</Text>
          </Pressable>
        }
      />
      <View style={s.sectionHead}>
        <SectionHeader title="All activity" meta={`${count} ${count === 1 ? "entry" : "entries"}`} />
      </View>
      <ActivityFilters
        fromDate={fromDate}
        toDate={toDate}
        datePreset={datePreset}
        type={typeFilter}
        description={description}
        savedDescriptions={savedDescriptions}
        onDatePresetChange={setDatePreset}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onTypeChange={setTypeFilter}
        onDescriptionChange={setDescription}
        onClear={clearFilters}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.listContainer}>
          <SectionList<Entry, Section>
            style={s.list}
            showsVerticalScrollIndicator={false}
            sections={sections}
            keyExtractor={(e) => e.id}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => (
              <View style={s.dayWrap}>
                <DayHeader label={section.title} />
              </View>
            )}
            stickySectionHeadersEnabled
            ListHeaderComponent={header}
            ListEmptyComponent={
              <View style={s.inset}>
                {sorted.length === 0 ? (
                  <EmptyState
                    text="No activity yet."
                    actionLabel="Add your first transaction"
                    onAction={() => router.push("/add")}
                  />
                ) : (
                  <EmptyState
                    text={invalidDateRange ? "The start date is after the end date." : "No activity matches these filters."}
                    actionLabel="Clear filters"
                    onAction={clearFilters}
                  />
                )}
              </View>
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={12}
            windowSize={9}
            removeClippedSubviews={Platform.OS === "android"}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      </KeyboardAvoidingView>
      <EntryActionsSheet
        visible={!!actionEntry}
        entry={actionEntry}
        isRecurring={!!selectedRule}
        onClose={() => setActionEntry(null)}
        onEdit={() => {
          if (actionEntry) router.push({ pathname: "/add", params: { entryId: actionEntry.id } });
          setActionEntry(null);
        }}
        onDelete={() => {
          if (actionEntry) remove(actionEntry);
          setActionEntry(null);
        }}
        onMakeRecurring={() => {
          setRecurringEntry(actionEntry);
          setActionEntry(null);
        }}
        onStopRecurring={() => {
          if (selectedRule) stopRecurringRule(selectedRule.id);
          setActionEntry(null);
        }}
      />
      {recurringEntry && (
        <RecurringEntrySheet
          key={recurringEntry.id}
          visible
          entry={recurringEntry}
          onClose={() => setRecurringEntry(null)}
          onSave={(frequency, endDate) => {
            addRecurringRule(recurringEntry, frequency, endDate);
            setRecurringEntry(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.canvas },
    listContainer: {
      flex: 1,
      width: "100%",
      maxWidth: 1120,
      alignSelf: "center",
    },
    list: { flex: 1 },
    inset: { paddingHorizontal: SCREEN_INSET },
    header: { paddingHorizontal: SCREEN_INSET, paddingTop: 20 },
    pageHeader: { marginBottom: 24 },
    sectionHead: { marginBottom: 16 },
    addButton: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: C.accent,
    },
    addButtonText: { color: C.onAccent, fontSize: 14, fontWeight: "700" },
    // Sticky day header: solid canvas so rows never show through
    dayWrap: {
      backgroundColor: C.canvas,
      paddingHorizontal: SCREEN_INSET,
      paddingTop: 12,
      paddingBottom: 6,
    },
  });
