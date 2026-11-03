import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "../lib/Brand";
import { Palette, useBudget } from "../lib/budget";
import { SCREEN_INSET } from "../lib/theme";
import { PageHeader } from "../lib/ui";

// Replace these with the creator's profile URLs before release.
const GITHUB_URL = "https://github.com/gio1025";
const LINKEDIN_URL = "https://www.linkedin.com/in/giobarrameda/";

export default function About() {
  const { colors: C } = useBudget();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const currentYear = new Date().getFullYear();

  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open link", "Please try again later.");
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <Pressable
          style={s.backButton}
          onPress={() => router.dismissTo("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Back to Settings"
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={C.accent} />
          <Text style={s.backLabel}>Settings</Text>
        </Pressable>
        <PageHeader
          title="About"
          subtitle="A little about KuriPot."
          style={s.pageHeader}
        />

        <View style={s.heroCard}>
          <BrandMark size={84} />
          <Text style={s.appName}>KuriPot</Text>
          <Text style={s.version}>Version {version}</Text>
          <Text style={s.tagline}>Proud to be kuripot.</Text>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={22} color={C.accent} />
            <Text style={s.bodyText}>Owner &amp; creator: Gio</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Ionicons name="code-slash-outline" size={22} color={C.accent} />
            <Text style={s.bodyText}>
              Built with AI-assisted development (vibe coding) using React Native + Expo.
            </Text>
          </View>
        </View>

        <View style={s.linksCard}>
          <Text style={s.sectionTitle}>Find me online</Text>
          <Pressable
            style={s.linkRow}
            onPress={() => openLink(GITHUB_URL)}
            accessibilityRole="link"
          >
            <Ionicons name="logo-github" size={23} color={C.textPrimary} />
            <Text style={s.linkLabel}>GitHub</Text>
            <Ionicons name="open-outline" size={19} color={C.textSecondary} />
          </Pressable>
          <View style={s.divider} />
          <Pressable
            style={s.linkRow}
            onPress={() => openLink(LINKEDIN_URL)}
            accessibilityRole="link"
          >
            <Ionicons name="logo-linkedin" size={23} color={C.accent} />
            <Text style={s.linkLabel}>LinkedIn</Text>
            <Ionicons name="open-outline" size={19} color={C.textSecondary} />
          </Pressable>
        </View>

        <View style={s.privacyCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color={C.accent} />
          <Text style={s.bodyText}>
            Your data is saved on this device and syncs to your account when you’re signed in.
          </Text>
        </View>

        <View style={s.definitionCard}>
          <Text style={s.definitionTerm}>Kuripot (n.)</Text>
          <Text style={s.definitionText}>
            Someone who knows where every peso goes, and makes it count.
          </Text>
        </View>

        <Text style={s.copyright}>© {currentYear} Gio. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.canvas },
    content: {
      width: "100%",
      maxWidth: 680,
      alignSelf: "center",
      paddingHorizontal: SCREEN_INSET,
      paddingTop: 24,
      paddingBottom: 40,
      gap: 16,
    },
    pageHeader: { marginBottom: 4 },
    backButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    backLabel: { fontSize: 16, fontWeight: "600", color: C.accent },
    heroCard: {
      alignItems: "center",
      padding: 26,
      borderRadius: 22,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
      gap: 8,
    },
    appName: { fontSize: 28, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.5 },
    version: { fontSize: 16, color: C.textSecondary },
    tagline: { marginTop: 8, fontSize: 19, fontWeight: "600", color: C.accent, textAlign: "center" },
    infoCard: {
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 18 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.hairline },
    bodyText: { flex: 1, fontSize: 17, lineHeight: 25, color: C.textPrimary },
    linksCard: {
      paddingHorizontal: 18,
      paddingTop: 18,
      borderRadius: 18,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    sectionTitle: { marginBottom: 6, fontSize: 16, fontWeight: "700", color: C.textSecondary },
    linkRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 14 },
    linkLabel: { flex: 1, fontSize: 18, fontWeight: "600", color: C.textPrimary },
    privacyCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 18,
      borderRadius: 18,
      backgroundColor: C.fillSubtle,
    },
    definitionCard: {
      padding: 20,
      borderRadius: 18,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
      gap: 8,
    },
    definitionTerm: { fontSize: 19, fontWeight: "700", color: C.accent },
    definitionText: { fontSize: 17, lineHeight: 25, color: C.textPrimary },
    copyright: { paddingTop: 4, fontSize: 14, textAlign: "center", color: C.textSecondary },
  });
