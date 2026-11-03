import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ComponentProps } from "react";
import { ColorValue, Platform, useWindowDimensions } from "react-native";
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

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.selection() }}
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
  );
}