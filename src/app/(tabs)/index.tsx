import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
  groupByDay,
  useSpokenMoney,
} from "../../lib/ui";

export default function Home() {
  const { sorted, totals, money, tagMap, colors: C } = useBudget();
  const spoken = useSpokenMoney();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();

  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // This month, in one pass
  const month = useMemo(() => {
    const key = toDateStr(new Date()).slice(0, 7);
    let income = 0;
    let expense = 0;
    for (const e of sorted) {
      if (!entryDate(e).startsWith(key)) continue;
      if (e.type === "income") income += e.amount;
      else expense += e.amount;
    }
    return { income, expense };
  }, [sorted]);

  const delta = month.income - month.expense;
  const spentShare =
    month.income > 0 ? Math.min(month.expense / month.income, 1) : month.expense > 0 ? 1 : 0;

  const groups = useMemo(() => groupByDay(sorted.slice(0, 5)), [sorted]);
  const goAdd = () => router.push("/transactions");

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <BrandLockup markSize={40} />
        <PageHeader title="Overview" subtitle={dateLine} style={s.pageHeader} />

        {/* Hero: the number, the change, the next action */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>Total balance</Text>
          <MoneyText value={totals.balance} variant="hero" />
          <Text
            style={s.deltaLine}
            accessibilityLabel={`${delta >= 0 ? "Up" : "Down"} ${spoken(Math.abs(delta))} this month`}
          >
            <Text style={{ color: delta >= 0 ? C.positive : C.negative, fontWeight: "600" }}>
              {delta >= 0 ? "+" : "−"}
              {money(Math.abs(delta))}
            </Text>
            <Text style={s.metaText}> this month</Text>
          </Text>
          <View style={{ marginTop: 20 }}>
            <PrimaryButton label="Add transaction" onPress={goAdd} />
          </View>
        </View>

        <Hairline />

        <View style={s.block}>
          <SectionHeader title="This month" />
          <View style={s.line}>
            <Text style={s.lineLabel}>Money in</Text>
            <MoneyText value={month.income} />
          </View>
          <View style={s.line}>
            <Text style={s.lineLabel}>Money out</Text>
            <MoneyText value={month.expense} />
          </View>
          {month.income > 0 && (
            <View style={{ gap: 8 }}>
              <ProgressTrack value={spentShare} />
              <Text style={s.metaText}>{Math.round(spentShare * 100)}% of income spent</Text>
            </View>
          )}
        </View>

        <Hairline />

        <View style={s.block}>
          <SectionHeader title="Recent activity" actionLabel="See all" onAction={goAdd} />
          {groups.length === 0 ? (
            <EmptyState
              text="No transactions yet."
              actionLabel="Add your first transaction"
              onAction={goAdd}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.canvas },
    scroll: { paddingHorizontal: SCREEN_INSET, paddingTop: 16, paddingBottom: 40 },
    pageHeader: { marginTop: 8 },
    hero: { paddingTop: 28, paddingBottom: 28 },
    heroLabel: { ...type.meta, color: C.textSecondary, marginBottom: 4 },
    deltaLine: { ...type.body, marginTop: 6 },
    metaText: { ...type.meta, color: C.textSecondary },
    block: { paddingVertical: 24, gap: 16 },
    line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    lineLabel: { ...type.body, color: C.textSecondary },
    dayGap: { paddingTop: 12, paddingBottom: 4 },
  });