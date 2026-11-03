import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SavedDescription, SavedDescriptionType } from "../lib/budget";
import { Palette, confirmAction, useBudget } from "../lib/budget";
import { SCREEN_INSET } from "../lib/theme";
import { EmptyState, PageHeader } from "../lib/ui";

export default function Descriptions() {
  const { savedDescriptions, addSavedDescription, updateSavedDescription, deleteSavedDescription, colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const [editing, setEditing] = useState<SavedDescription | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [listType, setListType] = useState<"income" | "expense">("expense");
  const [descriptionType, setDescriptionType] = useState<SavedDescriptionType>("expense");

  const beginAdd = () => {
    setEditing({ id: "", name: "", type: listType });
    setName("");
    setError("");
    setDescriptionType(listType);
  };

  const beginEdit = (description: SavedDescription) => {
    setEditing(description);
    setName(description.name);
    setError("");
    setDescriptionType(description.type);
  };

  const cancel = () => {
    setEditing(null);
    setName("");
    setError("");
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a description.");
      return;
    }
    if (
      savedDescriptions.some(
        (description) =>
          description.id !== editing?.id &&
          description.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase() &&
          (description.type === descriptionType ||
            description.type === "both" ||
            descriptionType === "both")
      )
    ) {
      setError("That saved description already exists.");
      return;
    }
    if (editing?.id) updateSavedDescription(editing.id, trimmed, descriptionType);
    else addSavedDescription(trimmed, descriptionType);
    cancel();
  };

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <PageHeader
          title="Saved descriptions"
          subtitle="Reusable suggestions. You can also enter any description without saving it."
          style={s.header}
          action={
            <Pressable style={s.addButton} onPress={beginAdd} accessibilityRole="button">
              <Ionicons name="add" size={18} color={C.onAccent} />
              <Text style={s.addLabel}>Add</Text>
            </Pressable>
          }
        />

        {editing && (
          <View style={s.editor}>
            <Text style={s.editorTitle}>{editing.id ? "Edit description" : "New description"}</Text>
            <View style={s.kindRow}>
              {(
                [
                  { value: "expense", label: "Expense" },
                  { value: "income", label: "Income" },
                  ...(editing.id && editing.type === "both"
                    ? [{ value: "both" as const, label: "Both" }]
                    : []),
                ] as { value: SavedDescriptionType; label: string }[]
              ).map((option) => (
                <Pressable
                  key={option.value}
                  style={[s.kindOption, descriptionType === option.value && s.kindOptionSelected]}
                  onPress={() => setDescriptionType(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: descriptionType === option.value }}
                >
                  <Text
                    style={[
                      s.kindOptionText,
                      descriptionType === option.value && s.kindOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError("");
              }}
              placeholder="e.g. Coffee"
              placeholderTextColor={C.textTertiary}
              maxLength={60}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={save}
              accessibilityLabel="Saved description"
            />
            {!!error && <Text style={s.error}>{error}</Text>}
            <View style={s.actions}>
              <Pressable style={s.cancelButton} onPress={cancel} accessibilityRole="button">
                <Text style={s.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable style={s.saveButton} onPress={save} accessibilityRole="button">
                <Text style={s.saveLabel}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={s.kindRow}>
          {(["expense", "income"] as const).map((kind) => (
            <Pressable
              key={kind}
              style={[s.kindOption, listType === kind && s.kindOptionSelected]}
              onPress={() => {
                setListType(kind);
                if (!editing) setDescriptionType(kind);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: listType === kind }}
            >
              <Text style={[s.kindOptionText, listType === kind && s.kindOptionTextSelected]}>
                {kind === "expense" ? "Expenses" : "Income"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.list}>
          {savedDescriptions.filter(
            (description) => description.type === listType || description.type === "both"
          ).length === 0 ? (
            <EmptyState
              text={`No saved ${listType} descriptions yet.`}
              actionLabel="Add a description"
              onAction={beginAdd}
            />
          ) : (
            savedDescriptions
              .filter(
                (description) => description.type === listType || description.type === "both"
              )
              .map((description) => (
              <View key={description.id} style={s.row}>
                <Text style={s.name} numberOfLines={2}>{description.name}</Text>
                <Pressable
                  style={s.iconButton}
                  onPress={() => beginEdit(description)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${description.name}`}
                >
                  <Ionicons name="create-outline" size={20} color={C.accent} />
                </Pressable>
                <Pressable
                  style={s.iconButton}
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
                  <Ionicons name="trash-outline" size={20} color={C.negative} />
                </Pressable>
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
    content: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      paddingHorizontal: SCREEN_INSET,
      paddingTop: 24,
      paddingBottom: 40,
    },
    header: { marginBottom: 24 },
    addButton: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: C.accent,
    },
    addLabel: { color: C.onAccent, fontSize: 14, fontWeight: "700" },
    editor: {
      padding: 16,
      marginBottom: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: C.hairline,
      borderRadius: 16,
      backgroundColor: C.surface,
    },
    editorTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
    kindRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    kindOption: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.canvas,
    },
    kindOptionSelected: { borderColor: C.accent, backgroundColor: C.highlight },
    kindOptionText: { color: C.textSecondary, fontWeight: "600" },
    kindOptionTextSelected: { color: C.accent },
    input: {
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.hairline,
      color: C.textPrimary,
      backgroundColor: C.canvas,
      fontSize: 16,
    },
    error: { color: C.negative, fontSize: 13 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
    cancelButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14 },
    cancelLabel: { color: C.textSecondary, fontWeight: "600" },
    saveButton: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: C.accent,
    },
    saveLabel: { color: C.onAccent, fontWeight: "700" },
    list: {
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: C.hairline,
      borderRadius: 16,
      backgroundColor: C.surface,
    },
    row: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.hairline,
    },
    name: { flex: 1, fontSize: 15, fontWeight: "500", color: C.textPrimary },
    iconButton: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  });
