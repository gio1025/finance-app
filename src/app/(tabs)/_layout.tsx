import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ColorValue, Platform, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBudget } from "../../lib/budget";
import { haptics } from "../../lib/haptics";
import { NavigationPreferencesProvider, useNavigationPreferences } from "../../lib/navigationPreferences";

type IconName = ComponentProps<typeof Ionicons>["name"];

const icon =
  (name: IconName) => {
    const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
      <Ionicons
        name={name}
        size={size}
        color={typeof color === "number" ? undefined : color ?? undefined}
      />
    );
    TabIcon.displayName = `TabIcon(${name})`;
    return TabIcon;
  };

export default function TabsLayout() {
  return (
    <NavigationPreferencesProvider>
      <TabNavigator />
    </NavigationPreferencesProvider>
  );
}

function TabNavigator() {
  const { colors: C } = useBudget();
  const { order } = useNavigationPreferences();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 960;
  const bottom = Math.max(insets.bottom, 8);
  const [loadingTab, setLoadingTab] = useState(false);
  const pendingRoute = useRef<string | null>(null);
  const visitedRoutes = useRef(new Set<string>());
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs
        screenListeners={({ navigation, route }) => ({
          tabPress: () => {
            haptics.selection();
            const state = navigation.getState();
            const activeRoute = state.routes[state.index]?.key;
            if (activeRoute === route.key) return;

            if (loadingTimer.current) clearTimeout(loadingTimer.current);
            loadingTimer.current = null;
            pendingRoute.current = visitedRoutes.current.has(route.key) ? null : route.key;
            setLoadingTab(pendingRoute.current !== null);
          },
          focus: () => {
            visitedRoutes.current.add(route.key);
            if (pendingRoute.current !== route.key) return;
            pendingRoute.current = null;
            if (loadingTimer.current) clearTimeout(loadingTimer.current);
            // Leave the indicator up briefly so the destination has time to paint.
            loadingTimer.current = setTimeout(() => setLoadingTab(false), 180);
          },
        })}
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          tabBarPosition: desktop ? "left" : "bottom",
          tabBarVariant: desktop ? "material" : "uikit",
          tabBarLabelPosition: desktop ? "beside-icon" : "below-icon",
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.textSecondary,
          tabBarAllowFontScaling: false,
          tabBarStyle: {
            backgroundColor: C.surface,
            ...(desktop
              ? {
                  width: 220,
                  borderRightColor: C.hairline,
                  borderRightWidth: 1,
                  borderTopWidth: 0,
                  paddingHorizontal: 12,
                }
              : {
                  borderTopColor: C.hairline,
                  borderTopWidth: 1,
                  height: 64 + bottom,
                  paddingTop: 8,
                  paddingBottom: bottom,
                }),
          },
          tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
        }}
      >
        {order.map((name) => {
          const options = {
            index: { title: "Home", tabBarIcon: icon("home-outline") },
            transactions: { title: "Activity", tabBarIcon: icon("list-outline") },
            add: { title: "Add", tabBarIcon: icon("add-circle-outline") },
            settings: { title: "Settings", tabBarIcon: icon("settings-outline") },
          }[name];
          return <Tabs.Screen key={name} name={name} options={options} />;
        })}
      </Tabs>
      {loadingTab && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading screen"
          style={{
            position: "absolute",
            top: 0,
            bottom: desktop ? 0 : 64 + bottom,
            left: desktop ? 220 : 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.bg,
            zIndex: 1,
          }}
        >
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ marginTop: 12, color: C.textSecondary, fontSize: 15 }}>Loading…</Text>
        </View>
      )}
    </View>
  );
}
