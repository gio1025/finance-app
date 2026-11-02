import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "./auth/AuthContext";
import { authErrorMessage } from "./auth/types";
import { Palette, confirmChange, notify, useBudget } from "./budget";

export default function AccountCard() {
  const { colors: C } = useBudget();
  const { user, signOut } = useAuth();
  const s = useMemo(() => makeStyles(C), [C]);
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.avatar}>
          <Text style={s.initials}>{initials || "?"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={s.email} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>
      <Pressable
        style={s.signOut}
        onPress={() =>
          confirmChange(
            "Sign out?",
            "You'll need to log in again to see your entries.",
            "Sign out",
            () => {
              void signOut().catch((error: unknown) => {
                notify("Couldn't sign out", authErrorMessage(error));
              });
            }
          )
        }
        accessibilityRole="button"
      >
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderRadius: 20,
      padding: 18,
      gap: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.line,
      shadowColor: "#101B26",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: C.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: { fontSize: 18, fontWeight: "800", color: C.onInk },
    name: { fontSize: 17, fontWeight: "700", color: C.ink },
    email: { fontSize: 14, color: C.muted, marginTop: 2 },
    signOut: {
      paddingVertical: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.expense,
      alignItems: "center",
    },
    signOutText: { fontSize: 16, fontWeight: "700", color: C.expense },
  });