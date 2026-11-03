import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntryForm from "../../lib/EntryForm";
import { useBudget } from "../../lib/budget";
import { SCREEN_INSET } from "../../lib/theme";
import { PageHeader } from "../../lib/ui";

export default function AddTransaction() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { entries, colors: C } = useBudget();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [nonce, setNonce] = useState(0);
  const editing = entryId ? entries.find((entry) => entry.id === entryId) ?? null : null;

  const done = () => {
    if (entryId) {
      router.replace("/transactions");
      return;
    }
    setNonce((value) => value + 1);
  };

  if (entryId && !editing) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader title="Transaction not found" subtitle="It may have been deleted." />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <PageHeader
          title={editing ? "Edit transaction" : "Add transaction"}
          subtitle={editing ? "Update the details below." : "Record money in or out."}
          style={styles.pageHeader}
        />
        <EntryForm key={editing?.id ?? `new-${nonce}`} editing={editing} onDone={done} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: ReturnType<typeof useBudget>["colors"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.canvas },
    content: {
      width: "100%",
      maxWidth: 720,
      alignSelf: "center",
      paddingHorizontal: SCREEN_INSET,
      paddingTop: 24,
      paddingBottom: 48,
    },
    pageHeader: { marginBottom: 24 },
  });
