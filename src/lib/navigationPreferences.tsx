import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const NAV_ITEMS = ["index", "transactions", "add", "settings"] as const;
export type NavItem = (typeof NAV_ITEMS)[number];
const NAV_ORDER_KEY = "kuripot-navigation-order-v1";

type Value = {
  order: NavItem[];
  move: (item: NavItem, direction: -1 | 1) => void;
};

const NavigationPreferencesContext = createContext<Value | null>(null);

function isNavOrder(value: unknown): value is NavItem[] {
  return (
    Array.isArray(value) &&
    value.length === NAV_ITEMS.length &&
    NAV_ITEMS.every((item) => value.includes(item))
  );
}

export function NavigationPreferencesProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<NavItem[]>([...NAV_ITEMS]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(NAV_ORDER_KEY)
      .then((saved) => {
        if (!active || !saved) return;
        const parsed: unknown = JSON.parse(saved);
        if (isNavOrder(parsed)) setOrder(parsed);
        else console.warn("Ignoring invalid saved navigation order.");
      })
      .catch((error: unknown) => console.warn("Unable to load navigation order.", error));
    return () => {
      active = false;
    };
  }, []);

  const move = useCallback((item: NavItem, direction: -1 | 1) => {
    const index = order.indexOf(item);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    AsyncStorage.setItem(NAV_ORDER_KEY, JSON.stringify(next)).catch((error: unknown) => {
      console.warn("Unable to save navigation order.", error);
    });
  }, [order]);

  const value = useMemo(() => ({ order, move }), [order, move]);
  return (
    <NavigationPreferencesContext.Provider value={value}>
      {children}
    </NavigationPreferencesContext.Provider>
  );
}

export function useNavigationPreferences() {
  const context = useContext(NavigationPreferencesContext);
  if (!context) throw new Error("useNavigationPreferences must be used inside its provider");
  return context;
}
