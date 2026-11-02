import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Entry, Palette, RecurringFrequency, Tag } from "./budget";
import { type } from "./theme";
import { Hairline } from "./ui";

// Styles are built once per palette, not once per row
const cache = new WeakMap<Palette, ReturnType<typeof makeStyles>>();
const getStyles = (C: Palette) => {
  let s = cache.get(C);
  if (!s) {
    s = makeStyles(C);
    cache.set(C, s);
  }
  return s;
};

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const timeCache = new Map<string, string>();
const showTime = (time: string) => {
  let v = timeCache.get(time);
  if (!v) {
    v = timeFmt.format(new Date(2000, 0, 1, +time.slice(0, 2), +time.slice(3, 5)));
    timeCache.set(time, v);
  }
  return v;
};

type Props = {
  item: Entry;
  tag?: Tag;
  C: Palette;
  money: (n: number) => string;
  spoken: (n: number) => string;
  recurrence?: RecurringFrequency;
  onMenu?: (e: Entry) => void;
};

const TILE = 32;

function EntryRow({ item, tag, C, money, spoken, recurrence, onMenu }: Props) {
  const s = getStyles(C);
  const isIncome = item.type === "income";
  const hasTitle = item.title.trim().length > 0;
  const label = hasTitle ? item.title.trim() : tag?.name ?? (isIncome ? "Income" : "Expense");
  // Category and time. (The day comes from the day header.)
  const sub = [
    tag && hasTitle ? tag.name : null,
    item.time ? showTime(item.time) : null,
    recurrence ? `Repeats ${recurrence}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const sign = isIncome ? "+" : "−";

  return (
    <View>
      <View style={s.row}>
        <View
          style={s.content}
          accessible
          accessibilityLabel={`${isIncome ? "Income" : "Expense"}, ${label}, ${
            isIncome ? "plus" : "minus"
          } ${spoken(item.amount)}${sub ? `, ${sub}` : ""}`}
        >
          <View style={s.tile}>
            <Ionicons
              name={isIncome ? "arrow-down-outline" : "arrow-up-outline"}
              size={16}
              color={C.textSecondary}
            />
          </View>
          <View style={s.text}>
            <Text style={s.title} numberOfLines={2}>
              {label}
            </Text>
            {!!sub && <Text style={s.meta}>{sub}</Text>}
          </View>
          <Text style={s.amount} numberOfLines={1}>
            {sign}
            {money(item.amount)}
          </Text>
        </View>
        {onMenu && (
          <Pressable
            onPress={() => onMenu(item)}
            style={s.menuButton}
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${label}`}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={C.textSecondary} />
          </Pressable>
        )}
      </View>
      <Hairline inset={TILE + 12} />
    </View>
  );
}

export default memo(EntryRow);

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", minHeight: 60 },
    content: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 60,
      paddingVertical: 12,
    },
    menuButton: {
      width: 40,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    tile: {
      width: TILE,
      height: TILE,
      borderRadius: 8,
      backgroundColor: C.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.hairline,
      alignItems: "center",
      justifyContent: "center",
    },
    text: { flex: 1 },
    title: { ...type.rowTitle, color: C.textPrimary },
    meta: { ...type.meta, color: C.textSecondary, marginTop: 2 },
    amount: { ...type.amount, color: C.textPrimary },
  });