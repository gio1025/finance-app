import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { SavedDescription } from "./budget";
import { showDate, useBudget } from "./budget";
import { DateField } from "./Pickers";
import { Chip } from "./ui";

export type DatePreset = "all" | "today" | "last7" | "thisMonth" | "lastMonth" | "custom";
type Props = {
  fromDate: string;
  toDate: string;
  datePreset: DatePreset;
  type: "all" | "income" | "expense";
  description: string;
  savedDescriptions: SavedDescription[];
  onDatePresetChange: (value: DatePreset) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onTypeChange: (value: Props["type"]) => void;
  onDescriptionChange: (value: string) => void;
  onClear: () => void;
};

type Dropdown = "descriptions" | "type" | null;
const DATE_PRESET_LABELS: Record<Exclude<DatePreset, "all" | "custom">, string> = {
  today: "Today",
  last7: "Last 7 days",
  thisMonth: "This month",
  lastMonth: "Last month",
};

export default function ActivityFilters({
  fromDate,
  toDate,
  datePreset,
  type,
  description,
  savedDescriptions,
  onDatePresetChange,
  onFromDateChange,
  onToDateChange,
  onTypeChange,
  onDescriptionChange,
  onClear,
}: Props) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const { width } = useWindowDimensions();
  const stackFields = width < 440;
  const [dropdown, setDropdown] = useState<Dropdown>(null);
  const [expanded, setExpanded] = useState(false);
  const invalidRange = !!fromDate && !!toDate && fromDate > toDate;
  const typeName = type === "all" ? "All types" : type === "income" ? "Income" : "Expense";
  const hasFilters = datePreset !== "all" || type !== "all" || !!description;
  const activeFilterCount =
    Number(datePreset !== "all") + Number(type !== "all") + Number(!!description.trim());
  const filterSummary = [
    datePreset === "custom" && (fromDate || toDate)
      ? `${fromDate ? showDate(fromDate) : "Any date"} – ${toDate ? showDate(toDate) : "Any date"}`
      : datePreset !== "all" && datePreset !== "custom"
        ? DATE_PRESET_LABELS[datePreset]
        : "",
    type !== "all" ? typeName : "",
    description ? `Description: “${description.trim()}”` : "",
  ].filter(Boolean);

  const options: { value: string; label: string; key?: string }[] =
    dropdown === "descriptions"
      ? savedDescriptions.map((saved) => ({
          key: saved.id,
          value: saved.name,
          label: `${saved.name}${saved.type === "both" ? "" : ` (${saved.type})`}`,
        }))
      : [
          { value: "all", label: "All types" },
          { value: "income", label: "Income" },
          { value: "expense", label: "Expense" },
        ];

  const select = (value: string) => {
    if (dropdown === "descriptions") onDescriptionChange(value);
    if (dropdown === "type") onTypeChange(value as Props["type"]);
    setDropdown(null);
  };

  return (
    <View style={s.card}>
      <View style={s.searchRow}>
        <View style={[s.search, s.searchMain]}>
          <Ionicons name="search-outline" size={18} color={C.textSecondary} />
          <TextInput
            style={s.searchInput}
            value={description}
            onChangeText={onDescriptionChange}
            placeholder="Search activity"
            placeholderTextColor={C.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search descriptions"
          />
          {!!description && (
            <Pressable onPress={() => onDescriptionChange("")} hitSlop={8} accessibilityLabel="Clear description search">
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
        {savedDescriptions.length > 0 && (
          <Pressable
            style={s.savedButton}
            onPress={() => setDropdown("descriptions")}
            accessibilityRole="button"
            accessibilityLabel="Choose a saved description to search"
          >
            <Ionicons name="bookmark-outline" size={18} color={C.accent} />
          </Pressable>
        )}
        <Pressable
          style={[s.filterToggle, activeFilterCount > 0 && s.filterToggleActive]}
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`Advanced filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount ? C.onAccent : C.textPrimary} />
          <Text style={[s.filterToggleText, activeFilterCount > 0 && s.filterToggleTextActive]}>
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={activeFilterCount ? C.onAccent : C.textSecondary}
          />
        </Pressable>
      </View>

      {filterSummary.length > 0 && (
        <View style={s.summaryRow}>
          <Text style={s.summary} numberOfLines={2}>{filterSummary.join("  ·  ")}</Text>
          <Pressable onPress={onClear} accessibilityRole="button">
            <Text style={s.clear}>Clear</Text>
          </Pressable>
        </View>
      )}

      {expanded && (
        <View style={s.advanced}>
          {hasFilters && (
            <Pressable style={s.resetAll} onPress={onClear} accessibilityRole="button">
              <Text style={s.clear}>Reset all</Text>
            </Pressable>
          )}
          <View style={s.field}>
            <Text style={s.label}>Date range</Text>
            <View style={s.presets}>
              {([
                ["all", "Any time"],
                ["today", "Today"],
                ["last7", "Last 7 days"],
                ["thisMonth", "This month"],
                ["lastMonth", "Last month"],
                ["custom", "Custom range"],
              ] as const).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={datePreset === value}
                  onPress={() => onDatePresetChange(value)}
                />
              ))}
            </View>
            {datePreset === "custom" && (
              <View style={s.customRange}>
                <View style={s.dateRow}>
                  <View style={s.dateField}>
                    <Text style={s.hint}>From</Text>
                    <View style={s.dateControl}>
                      <DateField value={fromDate} onChange={onFromDateChange} compact />
                    </View>
                  </View>
                  <View style={s.dateField}>
                    <Text style={s.hint}>To</Text>
                    <View style={s.dateControl}>
                      <DateField value={toDate} onChange={onToDateChange} compact />
                    </View>
                  </View>
                </View>
                {!!(fromDate || toDate) && (
                  <Pressable
                    style={s.clearRange}
                    onPress={() => {
                      onFromDateChange("");
                      onToDateChange("");
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close-circle-outline" size={16} color={C.accent} />
                    <Text style={s.clearRangeText}>Clear date range</Text>
                  </Pressable>
                )}
              </View>
            )}
            {invalidRange && <Text style={s.error}>The start date must be on or before the end date.</Text>}
          </View>

          <View style={[s.dropdownRow, stackFields && s.stackedFields]}>
            <View style={s.field}>
              <Text style={s.label}>Transaction type</Text>
              <Pressable
                style={s.dropdown}
                onPress={() => setDropdown("type")}
                accessibilityRole="button"
                accessibilityLabel={`Transaction type: ${typeName}`}
              >
                <Text style={s.dropdownText} numberOfLines={1}>{typeName}</Text>
                <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={dropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdown(null)}
      >
        <Pressable style={s.backdrop} onPress={() => setDropdown(null)}>
          <Pressable style={s.menu} onPress={() => {}}>
            <Text style={s.menuTitle}>{dropdown === "descriptions" ? "Saved descriptions" : "Transaction type"}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const selected = option.value === (dropdown === "descriptions" ? description : type);
                return (
                  <Pressable
                    key={option.key ?? option.value}
                    style={s.option}
                    onPress={() => select(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[s.optionText, selected && s.optionSelected]}>{option.label}</Text>
                    {selected && <Ionicons name="checkmark" size={20} color={C.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useBudget>["colors"]) =>
  StyleSheet.create({
    card: {
      padding: 12,
      marginBottom: 8,
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.surface,
    },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    searchMain: { flex: 1 },
    filterToggle: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.canvas,
    },
    filterToggleActive: { backgroundColor: C.accent, borderColor: C.accent },
    filterToggleText: { fontSize: 13, fontWeight: "600", color: C.textPrimary },
    filterToggleTextActive: { color: C.onAccent },
    summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    summary: { flex: 1, fontSize: 12, color: C.textSecondary },
    advanced: { gap: 14, paddingTop: 4 },
    resetAll: { alignSelf: "flex-end" },
    title: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    clear: { fontSize: 13, fontWeight: "600", color: C.accent },
    field: { flex: 1, minWidth: 0, gap: 6 },
    label: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
    hint: { fontSize: 11, color: C.textSecondary },
    dateRow: { flexDirection: "row", gap: 8 },
    customRange: {
      padding: 10,
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.canvas,
    },
    stackedFields: { flexDirection: "column" },
    dateField: { flex: 1, minWidth: 0, gap: 4 },
    dateControl: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
    clearRange: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 4 },
    clearRangeText: { fontSize: 12, fontWeight: "600", color: C.accent },
    dropdownRow: { flexDirection: "row", gap: 8 },
    dropdown: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.canvas,
    },
    dropdownText: { flex: 1, minWidth: 0, fontSize: 14, color: C.textPrimary },
    search: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.canvas,
    },
    searchInput: { flex: 1, minWidth: 0, paddingVertical: 8, fontSize: 15, color: C.textPrimary },
    savedButton: {
      width: 42,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.canvas,
    },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    error: { fontSize: 12, color: C.negative },
    backdrop: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    menu: {
      maxHeight: "70%",
      width: "100%",
      maxWidth: 420,
      alignSelf: "center",
      padding: 16,
      borderRadius: 18,
      backgroundColor: C.surface,
    },
    menuTitle: { marginBottom: 8, fontSize: 17, fontWeight: "700", color: C.textPrimary },
    option: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.hairline,
    },
    optionText: { fontSize: 15, color: C.textPrimary },
    optionSelected: { fontWeight: "700", color: C.accent },
  });
