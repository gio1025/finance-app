import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Entry, Palette, useBudget } from "./budget";
import { radius } from "./theme";

type Props = {
  visible: boolean;
  entry: Entry | null;
  isRecurring: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMakeRecurring: () => void;
  onStopRecurring: () => void;
};

export default function EntryActionsSheet({
  visible,
  entry,
  isRecurring,
  onClose,
  onEdit,
  onDelete,
  onMakeRecurring,
  onStopRecurring,
}: Props) {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  if (!entry) return null;

  const title = entry.title.trim() || (entry.type === "income" ? "Income" : "Expense");
  const actions = [
    { label: "Edit transaction", icon: "create-outline" as const, onPress: onEdit },
    {
      label: isRecurring ? "Stop recurring" : "Make it recurring",
      icon: "repeat-outline" as const,
      onPress: isRecurring ? onStopRecurring : onMakeRecurring,
    },
    { label: "Delete transaction", icon: "trash-outline" as const, onPress: onDelete, danger: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close transaction actions"
        />
        <View style={s.sheet} accessibilityViewIsModal>
          <View style={s.grabber} />
          <View style={s.heading}>
            <View style={s.headingText}>
              <Text style={s.title}>Transaction</Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={s.close}
            >
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </Pressable>
          </View>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [s.action, pressed && s.actionPressed]}
              accessibilityRole="button"
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.danger ? C.negative : C.textSecondary}
              />
              <Text style={[s.actionText, action.danger && { color: C.negative }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    sheet: {
      paddingHorizontal: 24,
      paddingTop: 10,
      paddingBottom: 28,
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    grabber: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.hairline,
      marginBottom: 18,
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    headingText: { flex: 1, gap: 2 },
    title: { fontSize: 18, fontWeight: "700", color: C.textPrimary },
    subtitle: { fontSize: 14, color: C.textSecondary },
    close: {
      width: 40,
      height: 40,
      borderRadius: radius.control,
      alignItems: "center",
      justifyContent: "center",
    },
    action: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      minHeight: 52,
      paddingHorizontal: 12,
      borderRadius: radius.control,
    },
    actionPressed: { backgroundColor: C.fillSubtle },
    actionText: { fontSize: 16, fontWeight: "500", color: C.textPrimary },
  });
