import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SectionList,
  SectionListRenderItem,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntryForm from "../../lib/EntryForm";
import EntryActionsSheet from "../../lib/EntryActionsSheet";
import EntryRow from "../../lib/EntryRow";
import RecurringEntrySheet from "../../lib/RecurringEntrySheet";
import { Entry, Palette, useBudget } from "../../lib/budget";
import { SCREEN_INSET } from "../../lib/theme";
import {
  Chip,
  DayHeader,
  EmptyState,
  PageHeader,
  SectionHeader,
  groupByDay,
  useSpokenMoney,
} from "../../lib/ui";

type Section = { key: string; title: string; data: Entry[] };

// One filter at a time: "all", "in", "out", or "tag:<id>"
export default function Transactions() {
  const {
    sorted,
    tags,
    tagMap,
    money,
    recurringRules,
    addRecurringRule,
    stopRecurringRule,
    deleteEntry,
    colors: C,
  } = useBudget();
  const spoken = useSpokenMoney();
  const s = useMemo(() => makeStyles(C), [C]);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [actionEntry, setActionEntry] = useState<Entry | null>(null);
  const [recurringEntry, setRecurringEntry] = useState<Entry | null>(null);
  const [nonce, setNonce] = useState(0);
  const [filterRaw, setFilter] = useState("all"); // kept for the session only
  const listRef = useRef<any>(null);

  // If the filtered category was deleted, fall back to All
  const filter =
    filterRaw.startsWith("tag:") && !tagMap.has(filterRaw.slice(4)) ? "all" : filterRaw;

  const sections = useMemo<Section[]>(() => {
    const rows = sorted.filter((e) =>
      filter === "all"
        ? true
        : filter === "in"
          ? e.type === "income"
          : filter === "out"
            ? e.type === "expense"
            : e.tagId === filter.slice(4)
    );
    return groupByDay(rows);
  }, [sorted, filter]);

  const count = useMemo(() => sections.reduce((n, g) => n + g.data.length, 0), [sections]);
  const recurringById = useMemo(
    () => new Map(recurringRules.map((rule) => [rule.id, rule])),
    [recurringRules]
  );
  const selectedRule = actionEntry?.recurringId
    ? recurringById.get(actionEntry.recurringId)
    : undefined;

  const scrollTop = () => listRef.current?.getScrollResponder?.()?.scrollTo?.({ y: 0, animated: true });

  const startEdit = useCallback((e: Entry) => {
    setEditing(e);
    scrollTop();
  }, []);

  // After adding or saving: reset the form
  const done = useCallback(() => {
    setEditing(null);
    setNonce((n) => n + 1);
  }, []);

  const remove = useCallback(
    (e: Entry) => {
      deleteEntry(e);
      setEditing((cur) => (cur?.id === e.id ? null : cur));
    },
    [deleteEntry]
  );

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

  const header = (
    <View style={s.header}>
      <PageHeader
        title="Transactions"
        subtitle={editing ? "Editing an entry" : "Add money in or out"}
        style={s.pageHeader}
      />

      <EntryForm key={editing?.id ?? `new-${nonce}`} editing={editing} onDone={done} />

      <View style={s.sectionGap}>
        <SectionHeader title="Activity" meta={`${count} ${count === 1 ? "entry" : "entries"}`} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.chips}
      >
        <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
        <Chip label="In" selected={filter === "in"} onPress={() => setFilter("in")} />
        <Chip label="Out" selected={filter === "out"} onPress={() => setFilter("out")} />
        {tags.map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            selected={filter === `tag:${t.id}`}
            onPress={() => setFilter(`tag:${t.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SectionList<Entry, Section>
          ref={listRef}
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
                  onAction={scrollTop}
                />
              ) : (
                <EmptyState
                  text="Nothing matches this filter."
                  actionLabel="Show all"
                  onAction={() => setFilter("all")}
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
      </KeyboardAvoidingView>
      <EntryActionsSheet
        visible={!!actionEntry}
        entry={actionEntry}
        isRecurring={!!selectedRule}
        onClose={() => setActionEntry(null)}
        onEdit={() => {
          if (actionEntry) startEdit(actionEntry);
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
    inset: { paddingHorizontal: SCREEN_INSET },
    header: { paddingHorizontal: SCREEN_INSET, paddingTop: 16 },
    pageHeader: { marginBottom: 24 },
    sectionGap: { marginTop: 32, marginBottom: 12 },
    chips: { gap: 8, paddingBottom: 8, alignItems: "center" },
    // Sticky day header: solid canvas so rows never show through
    dayWrap: {
      backgroundColor: C.canvas,
      paddingHorizontal: SCREEN_INSET,
      paddingTop: 12,
      paddingBottom: 6,
    },
  });