import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Appearance, Platform, useColorScheme } from "react-native";
import { loadBudgetData, syncBudgetData } from "./budgetData";
import type { BudgetSnapshot } from "./budgetData";
import { firstRecurringDate, materializeDueEntries } from "./recurrence";
import { isSupabaseConfigured } from "./supabase";

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type Entry = {
  id: string;
  type: "income" | "expense";
  title: string; // optional: may be empty
  amount: number;
  createdAt: number;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm (24h)
  tagId?: string; // optional
  recurringId?: string;
};

export type EntryInput = {
  type: "income" | "expense";
  title: string;
  amount: number;
  date: string;
  time: string;
  tagId?: string;
};

export type RecurringRule = {
  id: string;
  sourceEntryId: string;
  type: Entry["type"];
  title: string;
  amount: number;
  tagId?: string;
  time: string;
  frequency: RecurringFrequency;
  startDate: string;
  nextDate: string;
  endDate?: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
  kind: "income" | "expense";
};
export type TagInput = Omit<Tag, "id">;
export type SavedDescriptionType = Entry["type"] | "both";
export type SavedDescription = { id: string; name: string; type: SavedDescriptionType };

function mergeBudgetSnapshots(
  local: BudgetSnapshot,
  remote: BudgetSnapshot
): BudgetSnapshot {
  const mergeById = <T extends { id: string }>(remoteItems: T[], localItems: T[]) => {
    const remoteIds = new Set(remoteItems.map((item) => item.id));
    return [...remoteItems, ...localItems.filter((item) => !remoteIds.has(item.id))];
  };
  const mergedTags = [...remote.tags];
  const remoteTagsByName = new Map(
    remote.tags.map((tag) => [`${tag.kind}:${tag.name.trim().toLowerCase()}`, tag])
  );
  const localTagIds = new Map<string, string>();

  for (const tag of local.tags) {
    const sameId = mergedTags.find((item) => item.id === tag.id);
    const sameName = remoteTagsByName.get(`${tag.kind}:${tag.name.trim().toLowerCase()}`);
    const match = sameId ?? sameName;
    if (match) {
      localTagIds.set(tag.id, match.id);
    } else {
      mergedTags.push(tag);
      remoteTagsByName.set(`${tag.kind}:${tag.name.trim().toLowerCase()}`, tag);
    }
  }

  const descriptionsById = new Map(
    remote.savedDescriptions.map((description) => [description.id, description])
  );
  for (const description of local.savedDescriptions) {
    descriptionsById.set(description.id, description);
  }
  const mergedDescriptions: SavedDescription[] = [];
  const descriptionNames = new Set<string>();
  for (const description of descriptionsById.values()) {
    const key = `${description.type}:${description.name.trim().toLocaleLowerCase()}`;
    if (descriptionNames.has(key)) continue;
    descriptionNames.add(key);
    mergedDescriptions.push(description);
  }

  return {
    entries: mergeById(remote.entries, local.entries).map((entry) => ({
      ...entry,
      tagId: entry.tagId ? localTagIds.get(entry.tagId) ?? entry.tagId : undefined,
    })),
    recurringRules: mergeById(remote.recurringRules, local.recurringRules).map((rule) => ({
      ...rule,
      tagId: rule.tagId ? localTagIds.get(rule.tagId) ?? rule.tagId : undefined,
    })),
    tags: mergedTags,
    savedDescriptions: mergedDescriptions,
    currency: remote.currency,
  };
}

export type ThemeChoice = "system" | "light" | "dark";
export type BudgetSyncStatus = "notConnected" | "syncing" | "synced" | "error";

// Entries, categories and currency are stored per signed-in account.
// Appearance stays device-wide.
let ENTRIES_KEY = "budget-entries-v1";
let CURRENCY_KEY = "budget-currency-v1";
let TAGS_KEY = "budget-tags-v1";
let RECURRING_KEY = "budget-recurring-v1";
let DESCRIPTIONS_KEY = "budget-descriptions-v1";
const THEME_KEY = "budget-theme-v1";
const LEGACY_ADOPTED_KEY = "budget-legacy-adopted-v1";

export function setDataScope(id: string) {
  const suffix = id ? `:${id}` : "";
  ENTRIES_KEY = `budget-entries-v1${suffix}`;
  CURRENCY_KEY = `budget-currency-v1${suffix}`;
  TAGS_KEY = `budget-tags-v1${suffix}`;
  RECURRING_KEY = `budget-recurring-v1${suffix}`;
  DESCRIPTIONS_KEY = `budget-descriptions-v1${suffix}`;
}

// Semantic color tokens. Components read these names (via useBudget().colors).
export const LIGHT = {
  // --- tokens ---
  canvas: "#F6F4EF",
  surface: "#FFFDF8",
  surfaceElevated: "#FFFFFF",
  hairline: "rgba(26, 25, 22, 0.08)",
  textPrimary: "#1A1916",
  textSecondary: "#6B6760",
  textTertiary: "#8E8A83", // placeholders and decoration only (below AA)
  accent: "#1F4D3A",
  onAccent: "#FFFFFF",
  positive: "#1B7F4E",
  negative: "#B42318",
  warning: "#8A5A12",
  fillSubtle: "rgba(26, 25, 22, 0.05)",
  // --- legacy names: screens not yet migrated still read these ---
  bg: "#F6F4EF",
  ink: "#1A1916",
  onInk: "#FFFFFF",
  muted: "#6B6760",
  card: "#FFFDF8",
  line: "rgba(26, 25, 22, 0.08)",
  income: "#1B7F4E",
  expense: "#B42318",
  onFill: "#FFFFFF",
  incomeSoft: "rgba(27, 127, 78, 0.12)",
  expenseSoft: "rgba(180, 35, 24, 0.10)",
  heroBg: "#1A1916",
  heroText: "#FFFFFF",
  heroMuted: "#A7A49C",
  heroIncome: "#7DCEA0",
  heroExpense: "#F0A8A0",
  highlight: "rgba(26, 25, 22, 0.06)",
};

// Dark is its own palette, not an inverted copy of light
export const DARK: typeof LIGHT = {
  canvas: "#2A2F2A",
  surface: "#353A34",
  surfaceElevated: "#414740",
  hairline: "rgba(243, 241, 234, 0.12)",
  textPrimary: "#F5F2E8",
  textSecondary: "#C1C3B9",
  textTertiary: "#969A90",
  accent: "#A1CBAE",
  onAccent: "#2A2F2A",
  positive: "#91D3A8",
  negative: "#FFAAA0",
  warning: "#E9C98E",
  fillSubtle: "rgba(243, 241, 234, 0.08)",
  bg: "#2A2F2A",
  ink: "#F5F2E8",
  onInk: "#2A2F2A",
  muted: "#C1C3B9",
  card: "#353A34",
  line: "rgba(243, 241, 234, 0.12)",
  income: "#91D3A8",
  expense: "#FFAAA0",
  onFill: "#2A2F2A",
  incomeSoft: "rgba(145, 211, 168, 0.18)",
  expenseSoft: "rgba(255, 170, 160, 0.18)",
  heroBg: "#414740",
  heroText: "#F5F2E8",
  heroMuted: "#C1C3B9",
  heroIncome: "#91D3A8",
  heroExpense: "#FFAAA0",
  highlight: "rgba(243, 241, 234, 0.10)",
};

export type Palette = typeof LIGHT;

export const TAG_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#EF4444",
  "#64748B",
];

export const SUGGESTED_TAGS: TagInput[] = [
  { name: "Food", kind: "expense", color: TAG_COLORS[3] },
  { name: "Groceries", kind: "expense", color: TAG_COLORS[4] },
  { name: "Transport", kind: "expense", color: TAG_COLORS[0] },
  { name: "Bills", kind: "expense", color: TAG_COLORS[6] },
  { name: "Rent", kind: "expense", color: TAG_COLORS[1] },
  { name: "Health", kind: "expense", color: TAG_COLORS[2] },
  { name: "Shopping", kind: "expense", color: TAG_COLORS[2] },
  { name: "Entertainment", kind: "expense", color: TAG_COLORS[1] },
  { name: "Education", kind: "expense", color: TAG_COLORS[5] },
  { name: "Travel", kind: "expense", color: TAG_COLORS[5] },
  { name: "Subscriptions", kind: "expense", color: TAG_COLORS[7] },
  { name: "Salary", kind: "income", color: TAG_COLORS[4] },
  { name: "Freelance", kind: "income", color: TAG_COLORS[0] },
  { name: "Bonus", kind: "income", color: TAG_COLORS[3] },
  { name: "Gift", kind: "income", color: TAG_COLORS[2] },
  { name: "Interest", kind: "income", color: TAG_COLORS[5] },
];

const DEFAULT_TAG_NAMES = ["Food", "Transport", "Bills", "Shopping", "Salary"];

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const makeTag = (input: TagInput): Tag => ({ id: `t${newId()}`, ...input });

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", country: "United States", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", country: "Eurozone", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", country: "United Kingdom", flag: "🇬🇧" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", country: "Japan", flag: "🇯🇵" },
  { code: "CNY", symbol: "CN¥", name: "Chinese Yuan", country: "China", flag: "🇨🇳" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", country: "South Korea", flag: "🇰🇷" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", country: "India", flag: "🇮🇳" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", country: "Philippines", flag: "🇵🇭" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", country: "Singapore", flag: "🇸🇬" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", country: "Australia", flag: "🇦🇺" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", country: "Canada", flag: "🇨🇦" },
  { code: "CHF", symbol: "CHF ", name: "Swiss Franc", country: "Switzerland", flag: "🇨🇭" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", country: "Mexico", flag: "🇲🇽" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", country: "Brazil", flag: "🇧🇷" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", country: "Hong Kong", flag: "🇭🇰" },
  { code: "TWD", symbol: "NT$", name: "New Taiwan Dollar", country: "Taiwan", flag: "🇹🇼" },
  { code: "THB", symbol: "฿", name: "Thai Baht", country: "Thailand", flag: "🇹🇭" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", country: "Malaysia", flag: "🇲🇾" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", country: "Indonesia", flag: "🇮🇩" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", country: "Vietnam", flag: "🇻🇳" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", country: "New Zealand", flag: "🇳🇿" },
  { code: "AED", symbol: "AED ", name: "UAE Dirham", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SAR", symbol: "SAR ", name: "Saudi Riyal", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "ZAR", symbol: "R", name: "South African Rand", country: "South Africa", flag: "🇿🇦" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", country: "Turkey", flag: "🇹🇷" },
  { code: "SEK", symbol: "kr ", name: "Swedish Krona", country: "Sweden", flag: "🇸🇪" },
  { code: "NOK", symbol: "kr ", name: "Norwegian Krone", country: "Norway", flag: "🇳🇴" },
  { code: "DKK", symbol: "kr ", name: "Danish Krone", country: "Denmark", flag: "🇩🇰" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", country: "Poland", flag: "🇵🇱" },
];

export const pad = (n: number) => String(n).padStart(2, "0");
export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const isValidDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && toDateStr(new Date(s + "T00:00:00")) === s;
export const isValidTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const entryDate = (e: Entry) => e.date ?? toDateStr(new Date(e.createdAt));

// What to show as the entry's name: description, else tag, else the type
export const entryLabel = (e: Entry, tags: Map<string, Tag>) =>
  e.title.trim() ||
  (e.tagId ? tags.get(e.tagId)?.name : undefined) ||
  (e.type === "income" ? "Income" : "Expense");

// Formatters are created once and reused (much cheaper than toLocale* per row)
const numberFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dateCache = new Map<string, string>();
export const showDate = (s: string) => {
  let v = dateCache.get(s);
  if (!v) {
    v = dateFmt.format(new Date(s + "T00:00:00"));
    dateCache.set(s, v);
  }
  return v;
};
export const showDateTime = (date: string, time?: string) => {
  if (!time) return showDate(date);
  const key = `${date} ${time}`;
  let v = dateCache.get(key);
  if (!v) {
    v = dateTimeFmt.format(new Date(`${date}T${time}:00`));
    dateCache.set(key, v);
  }
  return v;
};

// "1,250.50" -> 1250.5, "12,5" -> 12.5
export const parseAmount = (s: string) => {
  let t = s.trim();
  if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  const v = parseFloat(t);
  return isFinite(v) ? v : NaN;
};

// Dialogs that also work in the browser preview
export function notify(title: string, message: string) {
  if (Platform.OS === "web") (globalThis as any).alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void
) {
  if (Platform.OS === "web") {
    if ((globalThis as any).confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Keep", style: "cancel" },
    { text: confirmText, style: "destructive", onPress: onConfirm },
  ]);
}

// Confirmation for normal (non-destructive) changes
export function confirmChange(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void
) {
  if (Platform.OS === "web") {
    if ((globalThis as any).confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmText, onPress: onConfirm },
  ]);
}

type BudgetContextValue = {
  loaded: boolean;
  syncStatus: BudgetSyncStatus;
  retrySync: () => Promise<void>;
  entries: Entry[];
  recurringRules: RecurringRule[];
  sorted: Entry[];
  totals: { income: number; expense: number; balance: number };
  tags: Tag[];
  savedDescriptions: SavedDescription[];
  tagMap: Map<string, Tag>;
  addTag: (input: TagInput) => void;
  updateTag: (id: string, input: TagInput) => void;
  deleteTag: (id: string) => void;
  addSavedDescription: (name: string, type: SavedDescriptionType) => void;
  updateSavedDescription: (id: string, name: string, type: SavedDescriptionType) => void;
  deleteSavedDescription: (id: string) => void;
  currency: string; // currency code, e.g. "USD"
  setCurrency: (code: string) => void;
  symbol: string; // short symbol, e.g. "$"
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  isDark: boolean;
  colors: Palette;
  money: (n: number) => string;
  addEntry: (input: EntryInput) => Entry;
  updateEntry: (id: string, input: EntryInput) => void;
  deleteEntry: (entry: Entry) => void;
  addRecurringRule: (entry: Entry, frequency: RecurringFrequency, endDate?: string) => void;
  updateRecurringRule: (
    id: string,
    frequency: RecurringFrequency,
    endDate?: string
  ) => void;
  stopRecurringRule: (id: string) => void;
  clearAll: () => void;
  undo: Entry | null;
  undoDelete: () => void;
  dismissUndo: () => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used inside BudgetProvider");
  return ctx;
}

export function BudgetProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [savedDescriptions, setSavedDescriptions] = useState<SavedDescription[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [loaded, setLoaded] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<BudgetSyncStatus>("notConnected");
  const [undo, setUndo] = useState<Entry | null>(null);
  const [undoRecurringRule, setUndoRecurringRule] = useState<RecurringRule | null>(null);
  const [undoRecurringEntries, setUndoRecurringEntries] = useState<Entry[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const retryingSync = useRef(false);
  const snapshotRef = useRef<BudgetSnapshot>({ entries, recurringRules, tags, savedDescriptions, currency });
  const system = useColorScheme();

  const isDark = theme === "dark" || (theme === "system" && system === "dark");
  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    let active = true;
    async function initialize() {
      let shouldSyncRemote = false;
      setSyncStatus(userId && isSupabaseConfigured ? "syncing" : "notConnected");
      try {
        if (userId && isSupabaseConfigured) {
          const adoptedUser = await AsyncStorage.getItem(LEGACY_ADOPTED_KEY);
          if (!adoptedUser) {
            for (const key of [
              "budget-entries-v1",
              "budget-currency-v1",
              "budget-tags-v1",
              "budget-recurring-v1",
              "budget-descriptions-v1",
            ]) {
              const legacyValue = await AsyncStorage.getItem(key);
              if (legacyValue !== null) {
                await AsyncStorage.setItem(`${key}:${userId}`, legacyValue);
                await AsyncStorage.removeItem(key);
              }
            }
            await AsyncStorage.setItem(LEGACY_ADOPTED_KEY, userId);
          }
        }

        const [rawEntries, rawCurrency, rawTheme, rawTags, rawRecurringRules, rawDescriptions] = await Promise.all([
          AsyncStorage.getItem(ENTRIES_KEY),
          AsyncStorage.getItem(CURRENCY_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(TAGS_KEY),
          AsyncStorage.getItem(RECURRING_KEY),
          AsyncStorage.getItem(DESCRIPTIONS_KEY),
        ]);
        const localEntries: Entry[] = rawEntries ? JSON.parse(rawEntries) : [];
        const localRecurringRules: RecurringRule[] = rawRecurringRules
          ? JSON.parse(rawRecurringRules)
          : [];
        const localTags: Tag[] = rawTags
          ? JSON.parse(rawTags)
          : SUGGESTED_TAGS.filter((tag) => DEFAULT_TAG_NAMES.includes(tag.name)).map(makeTag);
        const localDescriptions: SavedDescription[] = rawDescriptions
          ? (JSON.parse(rawDescriptions) as { id: string; name: string; type?: string }[]).map(
              (description) => ({
                id: description.id,
                name: description.name,
                type:
                  description.type === "income" ||
                  description.type === "expense" ||
                  description.type === "both"
                    ? description.type
                    : "both",
              })
            )
          : [];
        const foundCurrency = CURRENCIES.find(
          (item) => item.code === rawCurrency || item.symbol === rawCurrency
        );
        const rawSnapshot = {
          entries: localEntries.map((entry) => ({
            ...entry,
            title: entry.title ?? "",
            date: entry.date ?? toDateStr(new Date(entry.createdAt)),
          })),
          recurringRules: localRecurringRules,
          tags: localTags,
          savedDescriptions: localDescriptions,
          currency: foundCurrency?.code ?? "USD",
        };
        let snapshot: BudgetSnapshot = rawSnapshot;

        if (userId && isSupabaseConfigured) {
          try {
            snapshot = mergeBudgetSnapshots(
              rawSnapshot,
              await loadBudgetData(userId, rawSnapshot)
            );
            shouldSyncRemote = true;
          } catch (error) {
            console.warn("Unable to load KuriPot data from Supabase.", error);
            setSyncStatus("error");
            // Cloud sync is optional. Keep startup and the on-device budget usable when
            // the device is offline or the Supabase project is temporarily unavailable.
          }
        }

        if (!active) return;
        const caughtUp = materializeDueEntries(
          snapshot.recurringRules ?? [],
          snapshot.entries,
          toDateStr(new Date())
        );
        setEntries(
          caughtUp.entries.map((entry) => ({
            ...entry,
            title: entry.title ?? "",
            date: entry.date ?? toDateStr(new Date(entry.createdAt)),
          }))
        );
        setRecurringRules(caughtUp.rules);
        setTags(snapshot.tags);
        setSavedDescriptions(snapshot.savedDescriptions ?? []);
        setCurrency(snapshot.currency);
        if (rawTheme === "system" || rawTheme === "light" || rawTheme === "dark") {
          setTheme(rawTheme);
        }
        if (shouldSyncRemote) setRemoteReady(true);
      } catch (error) {
        console.warn("Unable to load KuriPot's saved budget.", error);
        notify("Budget couldn't be loaded", "Restart the app and try again.");
      } finally {
        if (active) setLoaded(true);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    snapshotRef.current = { entries, recurringRules, tags, savedDescriptions, currency };
  }, [entries, recurringRules, tags, savedDescriptions, currency]);

  const queueSync = useCallback(
    (snapshot: BudgetSnapshot) => {
      if (!userId) return Promise.resolve();
      const operation = syncQueue.current.then(() => {
        setSyncStatus("syncing");
        return syncBudgetData(userId, snapshot);
      });
      syncQueue.current = operation.catch(() => {});
      return operation;
    },
    [userId]
  );

  const retrySync = useCallback(async () => {
    if (!loaded || !userId || !isSupabaseConfigured || retryingSync.current) return;
    retryingSync.current = true;
    setSyncStatus("syncing");
    try {
      const remote = await loadBudgetData(userId, snapshotRef.current);
      const merged = mergeBudgetSnapshots(snapshotRef.current, remote);
      setEntries(merged.entries);
      setRecurringRules(merged.recurringRules);
      setTags(merged.tags);
      setSavedDescriptions(merged.savedDescriptions);
      setCurrency(merged.currency);
      setRemoteReady(true);
      await queueSync(merged);
      setSyncStatus("synced");
    } catch (error) {
      console.warn("Unable to retry KuriPot cloud sync.", error);
      setSyncStatus("error");
    } finally {
      retryingSync.current = false;
    }
  }, [loaded, userId, queueSync]);

  // Save when data changes (after the first load)
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries)).catch(() => {});
  }, [entries, loaded]);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(recurringRules)).catch((error: unknown) => {
        console.warn("Unable to save recurring transactions on this device.", error);
      });
    }
  }, [recurringRules, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(TAGS_KEY, JSON.stringify(tags)).catch(() => {});
  }, [tags, loaded]);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(DESCRIPTIONS_KEY, JSON.stringify(savedDescriptions)).catch((error: unknown) => {
        console.warn("Unable to save descriptions on this device.", error);
      });
    }
  }, [savedDescriptions, loaded]);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(CURRENCY_KEY, currency).catch(() => {});
  }, [currency, loaded]);

  useEffect(() => {
    if (!loaded || !remoteReady || !userId) return;
    const snapshot = { entries, recurringRules, tags, savedDescriptions, currency };
    void queueSync(snapshot)
      .then(() => setSyncStatus("synced"))
      .catch((error: unknown) => {
        console.warn("Unable to sync KuriPot data to Supabase.", error);
        setSyncStatus("error");
        // The local write has already completed. Do not interrupt the user with a
        // modal for a recoverable network/cloud-sync failure.
      });
  }, [entries, recurringRules, tags, savedDescriptions, currency, loaded, remoteReady, userId, queueSync]);

  const processDueRecurrences = useCallback(() => {
    const result = materializeDueEntries(recurringRules, entries, toDateStr(new Date()));
    if (result.entriesChanged) setEntries(result.entries);
    if (result.rulesChanged) setRecurringRules(result.rules);
  }, [recurringRules, entries]);

  useEffect(() => {
    if (!loaded) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        processDueRecurrences();
        if (syncStatus === "error") void retrySync();
      }
    });
    const activeRules = recurringRules.filter(
      (rule) => !rule.endDate || rule.nextDate <= rule.endDate
    );
    const nextDue = activeRules.reduce(
      (earliest, rule) => Math.min(earliest, new Date(`${rule.nextDate}T00:00:00`).getTime()),
      Number.POSITIVE_INFINITY
    );
    const timeout =
      activeRules.length > 0
        ? setTimeout(
            processDueRecurrences,
            Math.max(1000, Math.min(nextDue - Date.now(), 24 * 60 * 60 * 1000))
          )
        : null;
    return () => {
      subscription.remove();
      if (timeout) clearTimeout(timeout);
    };
  }, [loaded, processDueRecurrences, recurringRules, retrySync, syncStatus]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
    // Also makes keyboards and system alerts match your choice (not available on web)
    (Appearance as any).setColorScheme?.(theme === "system" ? null : theme);
  }, [theme, loaded]);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );

  // One pass over the entries instead of several filters
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (e.type === "income") income += e.amount;
      else expense += e.amount;
    }
    return { income, expense, balance: income - expense };
  }, [entries]);

  // Newest first: date, then time, then creation order
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          entryDate(b).localeCompare(entryDate(a)) ||
          (b.time ?? "").localeCompare(a.time ?? "") ||
          b.createdAt - a.createdAt
      ),
    [entries]
  );

  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const fullSymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? "$";
  const symbol = fullSymbol.trim();
  const money = useCallback((n: number) => fullSymbol + numberFmt.format(n), [fullSymbol]);

  const addEntry = useCallback((input: EntryInput) => {
    const entry: Entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      ...input,
    };
    setEntries((list) => [entry, ...list]);
    return entry;
  }, []);

  const updateEntry = useCallback((id: string, input: EntryInput) => {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...input } : e)));
    setRecurringRules((list) =>
      list.map((rule) =>
        rule.sourceEntryId === id
          ? {
              ...rule,
              type: input.type,
              title: input.title,
              amount: input.amount,
              tagId: input.tagId,
              time: input.time,
              startDate: input.date,
              nextDate: firstRecurringDate(input.date, rule.frequency, toDateStr(new Date())),
            }
          : rule
      )
    );
  }, []);

  const dismissUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
    setUndoRecurringRule(null);
    setUndoRecurringEntries([]);
  }, []);

  const deleteEntry = useCallback(
    (entry: Entry) => {
      const sourceRule = recurringRules.find((rule) => rule.sourceEntryId === entry.id) ?? null;
      const linkedEntries = sourceRule
        ? entries.filter((item) => item.recurringId === sourceRule.id && item.id !== entry.id)
        : [];
      setEntries((list) =>
        list
          .filter((item) => item.id !== entry.id)
          .map((item) =>
            sourceRule && item.recurringId === sourceRule.id
              ? { ...item, recurringId: undefined }
              : item
          )
      );
      if (sourceRule) {
        setRecurringRules((list) => list.filter((rule) => rule.id !== sourceRule.id));
      }
      setUndo(entry);
      setUndoRecurringRule(sourceRule);
      setUndoRecurringEntries(linkedEntries);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => {
        setUndo(null);
        setUndoRecurringRule(null);
        setUndoRecurringEntries([]);
      }, 5000);
    },
    [entries, recurringRules]
  );

  const addRecurringRule = useCallback(
    (entry: Entry, frequency: RecurringFrequency, endDate?: string) => {
      const startDate = entryDate(entry);
      const today = toDateStr(new Date());
      const nextDate = firstRecurringDate(startDate, frequency, today);
      if (endDate && endDate < nextDate) {
        notify("End date is too soon", "Choose an end date on or after the next occurrence.");
        return;
      }
      const id = `r${newId()}`;
      const rule: RecurringRule = {
        id,
        sourceEntryId: entry.id,
        type: entry.type,
        title: entry.title,
        amount: entry.amount,
        tagId: entry.tagId,
        time: entry.time ?? toTimeStr(new Date()),
        frequency,
        startDate,
        nextDate,
        endDate,
      };
      setRecurringRules((list) => [...list, rule]);
      setEntries((list) =>
        list.map((item) => (item.id === entry.id ? { ...item, recurringId: id } : item))
      );
    },
    []
  );

  const stopRecurringRule = useCallback((id: string) => {
    setRecurringRules((list) => list.filter((rule) => rule.id !== id));
    setEntries((list) =>
      list.map((entry) =>
        entry.recurringId === id ? { ...entry, recurringId: undefined } : entry
      )
    );
  }, []);

  const updateRecurringRule = useCallback(
    (id: string, frequency: RecurringFrequency, endDate?: string) => {
      const rule = recurringRules.find((item) => item.id === id);
      if (!rule) return;
      const nextDate = firstRecurringDate(rule.startDate, frequency, toDateStr(new Date()));
      if (endDate && endDate < nextDate) {
        notify("End date is too soon", "Choose an end date on or after the next occurrence.");
        return;
      }
      setRecurringRules((list) =>
        list.map((item) =>
          item.id === id ? { ...item, frequency, nextDate, endDate } : item
        )
      );
    },
    [recurringRules]
  );

  const undoDelete = useCallback(() => {
    if (!undo) return;
    const restoredEntries = new Map(undoRecurringEntries.map((entry) => [entry.id, entry]));
    setEntries((list) =>
      [
        { ...undo, recurringId: undoRecurringRule?.id ?? undo.recurringId },
        ...list,
      ].map((entry) => restoredEntries.get(entry.id) ?? entry)
    );
    if (undoRecurringRule) {
      setRecurringRules((list) => [...list, undoRecurringRule]);
    }
    dismissUndo();
  }, [undo, undoRecurringRule, undoRecurringEntries, dismissUndo]);

  const clearAll = useCallback(() => {
    setEntries([]);
    setRecurringRules([]);
    dismissUndo();
  }, [dismissUndo]);

  const addTag = useCallback((input: TagInput) => {
    setTags((list) => [...list, makeTag(input)]);
  }, []);

  const updateTag = useCallback((id: string, input: TagInput) => {
    setTags((list) => list.map((t) => (t.id === id ? { ...t, ...input } : t)));
    // If the tag switched between income and expense, entries of the other type lose it
    setEntries((list) =>
      list.map((e) => (e.tagId === id && e.type !== input.kind ? { ...e, tagId: undefined } : e))
    );
    setRecurringRules((list) =>
      list.map((rule) =>
        rule.tagId === id && rule.type !== input.kind ? { ...rule, tagId: undefined } : rule
      )
    );
  }, []);

  const deleteTag = useCallback((id: string) => {
    setTags((list) => list.filter((t) => t.id !== id));
    setEntries((list) => list.map((e) => (e.tagId === id ? { ...e, tagId: undefined } : e)));
    setRecurringRules((list) =>
      list.map((rule) => (rule.tagId === id ? { ...rule, tagId: undefined } : rule))
    );
  }, []);

  const addSavedDescription = useCallback((name: string, type: SavedDescriptionType) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSavedDescriptions((list) =>
      list.some(
        (item) =>
          item.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase() &&
          (item.type === type || item.type === "both" || type === "both")
      )
        ? list
        : [...list, { id: `d${newId()}`, name: trimmed, type }]
    );
  }, []);

  const updateSavedDescription = useCallback((id: string, name: string, type: SavedDescriptionType) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSavedDescriptions((list) =>
      list.map((item) =>
        item.id === id &&
        !list.some(
          (other) =>
            other.id !== id &&
            other.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase() &&
            (other.type === type || other.type === "both" || type === "both")
        )
          ? { ...item, name: trimmed, type }
          : item
      )
    );
  }, []);

  const deleteSavedDescription = useCallback((id: string) => {
    setSavedDescriptions((list) => list.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<BudgetContextValue>(
    () => ({
      loaded,
      syncStatus,
      retrySync,
      entries,
      recurringRules,
      sorted,
      totals,
      tags,
      savedDescriptions,
      tagMap,
      addTag,
      updateTag,
      deleteTag,
      addSavedDescription,
      updateSavedDescription,
      deleteSavedDescription,
      currency,
      setCurrency,
      symbol,
      theme,
      setTheme,
      isDark,
      colors,
      money,
      addEntry,
      updateEntry,
      deleteEntry,
      addRecurringRule,
      updateRecurringRule,
      stopRecurringRule,
      clearAll,
      undo,
      undoDelete,
      dismissUndo,
    }),
    [
      loaded,
      syncStatus,
      retrySync,
      entries,
      recurringRules,
      sorted,
      totals,
      tags,
      savedDescriptions,
      tagMap,
      addTag,
      updateTag,
      deleteTag,
      addSavedDescription,
      updateSavedDescription,
      deleteSavedDescription,
      currency,
      symbol,
      theme,
      isDark,
      colors,
      money,
      addEntry,
      updateEntry,
      deleteEntry,
      addRecurringRule,
      updateRecurringRule,
      stopRecurringRule,
      clearAll,
      undo,
      undoDelete,
      dismissUndo,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}
