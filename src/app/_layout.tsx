import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";
import LockScreen from "../lib/LockScreen";
import UndoBar from "../lib/UndoBar";
import { AuthProvider, useAuth } from "../lib/auth/AuthContext";
import { BudgetProvider, setDataScope, useBudget } from "../lib/budget";
import { LockProvider, useLock } from "../lib/lock";

// Keep the splash screen up until everything needed for the first screen is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Each account gets its own entries, categories and currency
function ScopedBudget({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  if (status === "loading") return null; // splash stays up while the session is restored
  const scope = user?.id ?? "guest";
  setDataScope(scope); // must run before BudgetProvider loads its data
  return <BudgetProvider key={scope} userId={user?.id}>{children}</BudgetProvider>;
}

function Root() {
  const { isDark, colors, loaded } = useBudget();
  const { ready } = useLock();
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  const all = loaded && ready;
  const shown = useRef(false);

  useEffect(() => {
    if (all) {
      shown.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [all]);

  // First launch: splash covers this. Later (log in / out): a plain background, no white flash.
  if (!all) return shown.current ? <View style={{ flex: 1, backgroundColor: colors.bg }} /> : null;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        {/* PROTECTED: only reachable while logged in */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="categories" options={{ presentation: "modal" }} />
          <Stack.Screen name="pin" options={{ presentation: "modal" }} />
        </Stack.Protected>

        {/* PUBLIC: only reachable while logged out */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ animation: "fade" }} />
          <Stack.Screen name="sign-up" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="forgot-password" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="auth/callback" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Screen name="update-password" options={{ presentation: "modal" }} />
      </Stack>
      <UndoBar />
      <LockScreen />
    </>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconFontError] = useFonts(Ionicons.font);

  // Keep the splash screen visible until Ionicons is ready, so web deployments
  // don't briefly or permanently show missing-glyph boxes.
  if (!iconsLoaded && !iconFontError) return null;

  return (
    <AuthProvider>
      <ScopedBudget>
        <LockProvider>
          <Root />
        </LockProvider>
      </ScopedBudget>
    </AuthProvider>
  );
}