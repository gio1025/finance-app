import { Svg, Circle, Path, Rect } from "react-native-svg";
import { StyleSheet, Text, View } from "react-native";
import { useBudget } from "./budget";

export function BrandMark({ size = 48 }: { size?: number }) {
  const { colors: C } = useBudget();

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="KuriPot logo">
      <Rect width="100" height="100" rx="28" fill={C.accent} />
      <Path
        d="M47 39V24M45 30C35 29 30 22 31 15c9 0 15 5 17 13m7-5c1-10 8-15 17-14 1 9-5 16-16 18"
        fill="none"
        stroke={C.onAccent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.5"
      />
      <Path
        d="M27 39h46l-4 38c-.5 4-3 6-7 6H38c-4 0-6.5-2-7-6l-4-38Z"
        fill={C.onAccent}
      />
      <Rect x="25" y="36" width="50" height="8" rx="4" fill={C.onAccent} />
      <Circle cx="50" cy="61" r="10" fill="#E8B96E" />
      <Path
        d="M50 54v14m4-11c-1-2-2-3-4-3-2.5 0-4 1.5-4 3.5s1.5 3 4 3.5 4 1.5 4 3.5S52.5 68 50 68c-2 0-3.5-1-4-3"
        fill="none"
        stroke="#254A3C"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </Svg>
  );
}

export function BrandLockup({ markSize = 42 }: { markSize?: number }) {
  const { colors: C } = useBudget();

  return (
    <View style={s.lockup} accessible accessibilityLabel="KuriPot">
      <BrandMark size={markSize} />
      <Text style={[s.wordmark, { color: C.textPrimary }]}>
        Kuri<Text style={{ color: C.accent }}>Pot</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  lockup: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { fontSize: 22, fontWeight: "800", letterSpacing: -0.7 },
});
