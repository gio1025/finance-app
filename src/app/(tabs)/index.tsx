import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntryRow from "../../lib/EntryRow";
import { BrandLockup } from "../../lib/Brand";
import { Palette, entryDate, toDateStr, useBudget } from "../../lib/budget";
import { SCREEN_INSET, type } from "../../lib/theme";
import {
  DayHeader,
  EmptyState,
  Hairline,
  MoneyText,
  PageHeader,
  PrimaryButton,
  ProgressTrack,
  SectionHeader,
  Chip,
  groupByDay,
  useSpokenMoney,
} from "../../lib/ui";

export default function Home() {
  const { sorted, totals, money, tagMap, colors: C } = useBudget();
  const spoken = useSpokenMoney();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const [datePreset, setDatePreset] = useState<
    | "today"
    | "yesterday"
    | "thisWeek"
    | "last7"
    | "thisMonth"
    | "lastMonth"
    | "all"
    | "lastWeek"
    | "last30"
    | "last3Months"
    | "thisYear"
    | "lastYear"
  >("thisMonth");
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 900;

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const periodLabel = {
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This week",
    last7: "Last 7 days",
    thisMonth: "This month",
    lastMonth: "Last month",
    all: "All time",
    lastWeek: "Last week",
    last30: "Last 30 days",
    last3Months: "Last 3 months",
    thisYear: "This year",
    lastYear: "Last year",
  }[datePreset];

  const periodEntries = useMemo(() => {
    const today = new Date();
    const todayStr = toDateStr(today);
    let from = "";
    let to = "";
    if (datePreset === "today") from = to = todayStr;
    if (datePreset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      from = to = toDateStr(yesterday);
    }
    if (datePreset === "thisWeek" || datePreset === "lastWeek") {
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      if (datePreset === "thisWeek") {
        from = toDateStr(startOfThisWeek);
        to = todayStr;
      } else {
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfThisWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
        from = toDateStr(startOfLastWeek);
        to = toDateStr(endOfLastWeek);
      }
    }
    if (datePreset === "last7") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      from = toDateStr(start);
      to = todayStr;
    }
    if (datePreset === "last30") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      from = toDateStr(start);
      to = todayStr;
    }
    if (datePreset === "last3Months") {
      const targetMonth = today.getMonth() - 3;
      const firstOfTargetMonth = new Date(today.getFullYear(), targetMonth, 1);
      const lastDayOfTargetMonth = new Date(
        firstOfTargetMonth.getFullYear(),
        firstOfTargetMonth.getMonth() + 1,
        0
      ).getDate();
      const start = new Date(
        firstOfTargetMonth.getFullYear(),
        firstOfTargetMonth.getMonth(),
        Math.min(today.getDate(), lastDayOfTargetMonth)
      );
      from = toDateStr(start);
      to = todayStr;
    }
    if (datePreset === "thisMonth") {
      from = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
      to = todayStr;
    }
    if (datePreset === "lastMonth") {
      from = toDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      to = toDateStr(new Date(today.getFullYear(), today.getMonth(), 0));
    }
    if (datePreset === "thisYear") {
      from = toDateStr(new Date(today.getFullYear(), 0, 1));
      to = todayStr;
    }
    if (datePreset === "lastYear") {
      from = toDateStr(new Date(today.getFullYear() - 1, 0, 1));
      to = toDateStr(new Date(today.getFullYear(), 0, 0));
    }
    const entries = datePreset === "all" ? sorted : sorted.filter((entry) => {
      const date = entryDate(entry);
      return (!from || date >= from) && (!to || date <= to);
    });
    return { entries, from, to };
  }, [sorted, datePreset]);

  const rangeLabel = useMemo(() => {
    const { from, to } = periodEntries;
    if (!from || !to) return periodLabel;
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    const formatFullDate = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
    return `${formatFullDate.format(start)} - ${formatFullDate.format(end)}`;
  }, [periodEntries, periodLabel]);

  const period = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of periodEntries.entries) {
      if (e.type === "income") income += e.amount;
      else expense += e.amount;
    }
    return { income, expense };
  }, [periodEntries]);

  const delta = period.income - period.expense;
  const spentShare =
    period.income > 0 ? Math.min(period.expense / period.income, 1) : period.expense > 0 ? 1 : 0;

  const groups = useMemo(() => groupByDay(periodEntries.entries.slice(0, 5)), [periodEntries.entries]);
  const goAdd = () => router.push("/add");
  const goActivity = () => router.push("/transactions");

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, desktop && s.desktopScroll]}>
        <View style={s.brandHeader}>
          <BrandLockup markSize={44} />
          <View style={s.brandRule} />
        </View>
        <PageHeader title="Overview" subtitle={dateLine} style={s.pageHeader} />

        <View style={[s.columns, desktop && s.desktopColumns]}>
          <View style={[s.mainColumn, desktop && s.desktopColumn]}>
            <View style={[s.hero, desktop && s.desktopPanel]}>
              <Text style={s.heroLabel}>Total balance</Text>
              <MoneyText value={totals.balance} variant="hero" />
              <Text
                style={s.deltaLine}
              accessibilityLabel={`${delta >= 0 ? "Up" : "Down"} ${spoken(Math.abs(delta))} ${periodLabel.toLowerCase()}`}
              >
                <Text style={{ color: delta >= 0 ? C.positive : C.negative, fontWeight: "600" }}>
                  {delta >= 0 ? "+" : "−"}
                  {money(Math.abs(delta))}
                </Text>
              <Text style={s.metaText}> {periodLabel.toLowerCase()}</Text>
              </Text>
              <View style={{ marginTop: 20 }}>
                <PrimaryButton label="Add transaction" onPress={goAdd} />
              </View>
            </View>

            {!desktop && <Hairline />}

            <View style={[s.block, desktop && s.desktopPanel]}>
              <SectionHeader title={rangeLabel} titleFitsOneLine titleStyle={{ fontSize: 16 }} />
              <View style={s.presets}>
                {([
                  ["today", "Today"],
                  ["yesterday", "Yesterday"],
                  ["thisWeek", "This week"],
                  ["last7", "Last 7 days"],
                  ["thisMonth", "This month"],
                  ["lastMonth", "Last month"],
                  ["all", "All time"],
                  ["lastWeek", "Last week"],
                  ["last30", "Last 30 days"],
                  ["last3Months", "Last 3 months"],
                  ["thisYear", "This year"],
                  ["lastYear", "Last year"],
                ] as const).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={datePreset === value}
                    onPress={() => setDatePreset(value)}
                  />
                ))}
              </View>
              <View style={s.line}>
                <Text style={s.lineLabel}>Money in</Text>
                <MoneyText value={period.income} />
              </View>
              <View style={s.line}>
                <Text style={s.lineLabel}>Money out</Text>
                <MoneyText value={period.expense} />
              </View>
              {period.income > 0 && (
                <View style={{ gap: 8 }}>
                  <ProgressTrack value={spentShare} />
                  <Text style={s.metaText}>{Math.round(spentShare * 100)}% of income spent</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[s.activityPanel, desktop && s.desktopColumn, desktop && s.desktopPanel]}>
            {!desktop && <Hairline />}
            <View style={s.block}>
              <SectionHeader title="Recent activity" actionLabel="See all" onAction={goActivity} />
              {groups.length === 0 ? (
                <EmptyState
                  text={sorted.length === 0 ? "No transactions yet." : `No activity for ${periodLabel.toLowerCase()}.`}
                  actionLabel={sorted.length === 0 ? "Add your first transaction" : undefined}
                  onAction={sorted.length === 0 ? goAdd : undefined}
                />
              ) : (
                groups.map((g) => (
                  <View key={g.key}>
                    <View style={s.dayGap}>
                      <DayHeader label={g.title} />
                    </View>
                    {g.data.map((item) => (
                      <EntryRow
                        key={item.id}
                        item={item}
                        tag={item.tagId ? tagMap.get(item.tagId) : undefined}
                        C={C}
                        money={money}
                        spoken={spoken}
                      />
                    ))}
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.canvas },
    scroll: { paddingHorizontal: SCREEN_INSET, paddingTop: 16, paddingBottom: 40, width: "100%" },
    desktopScroll: { maxWidth: 1280, alignSelf: "center" },
    brandHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 18,
    },
    brandRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.hairline },
    pageHeader: { marginTop: 0 },
    hero: { paddingTop: 28, paddingBottom: 28 },
    columns: { gap: 24 },
    desktopColumns: { flexDirection: "row", alignItems: "flex-start" },
    mainColumn: { gap: 16 },
    desktopColumn: { flex: 1, minWidth: 0 },
    desktopPanel: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.hairline,
      paddingHorizontal: 24,
    },
    activityPanel: {},
    heroLabel: { ...type.meta, color: C.textSecondary, marginBottom: 4 },
    deltaLine: { ...type.body, marginTop: 6 },
    metaText: { ...type.meta, color: C.textSecondary },
    block: { paddingVertical: 24, gap: 16 },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    lineLabel: { ...type.body, color: C.textSecondary },
    dayGap: { paddingTop: 12, paddingBottom: 4 },
  });
