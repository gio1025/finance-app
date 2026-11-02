import { TextStyle } from "react-native";

// 4pt base. Use these values only.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;
export const SCREEN_INSET = 24;
export const radius = { control: 12, card: 16 } as const;

const t = (s: TextStyle): TextStyle => s;

// The only text styles in the app. System font (SF Pro on iPhone), tabular figures for money.
export const type = {
  hero: t({ fontSize: 42, fontWeight: "600", letterSpacing: -0.8, fontVariant: ["tabular-nums"] }),
  title: t({ fontSize: 32, fontWeight: "700", letterSpacing: -0.4 }),
  section: t({ fontSize: 20, fontWeight: "600" }),
  body: t({ fontSize: 17, fontWeight: "400" }),
  rowTitle: t({ fontSize: 16, fontWeight: "500" }),
  meta: t({ fontSize: 13, fontWeight: "400" }),
  amount: t({ fontSize: 16, fontWeight: "500", fontVariant: ["tabular-nums"] }),
  caption: t({ fontSize: 12, fontWeight: "400" }),
  overline: t({ fontSize: 12, fontWeight: "500", letterSpacing: 1.2, textTransform: "uppercase" }),
};