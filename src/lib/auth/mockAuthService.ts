import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { AuthService, Session, authError } from "./types";
import { validateEmail } from "./validation";

/**
 * DEMO BACKEND: keeps accounts on this device only, so it is NOT real security.
 * Replace it with Supabase/Firebase by implementing the same AuthService interface
 * (see the example at the end of the instructions) and changing one line in AuthContext.
 */

const ACCOUNTS_KEY = "budget-mock-accounts-v1";

type Account = { id: string; name: string; email: string; salt: string; hash: string };
type Accounts = Record<string, Account>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)); // feels like a network call
const hashPassword = (salt: string, password: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);

async function loadAccounts(): Promise<Accounts> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const saveAccounts = (a: Accounts) => AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));

const toSession = (a: Account): Session => ({
  user: { id: a.id, email: a.email, name: a.name },
  token: Crypto.randomUUID(),
});

export const mockAuthService: AuthService = {
  async getSession() {
    return null;
  },

  subscribeToAuthChanges() {
    return () => {};
  },

  async signIn(email, password) {
    await sleep(700);
    const acc = (await loadAccounts())[email.trim().toLowerCase()];
    // Same error for "no such account" and "wrong password" so neither is revealed
    if (!acc || (await hashPassword(acc.salt, password)) !== acc.hash) {
      throw authError("invalid-credentials");
    }
    return toSession(acc);
  },

  async signUp({ name, email, password }) {
    await sleep(900);
    if (validateEmail(email)) throw authError("invalid-email");
    if (password.length < 8) throw authError("weak-password");
    const accounts = await loadAccounts();
    const key = email.trim().toLowerCase();
    if (accounts[key]) throw authError("email-in-use");
    const salt = Crypto.randomUUID();
    const acc: Account = {
      id: Crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      salt,
      hash: await hashPassword(salt, password),
    };
    accounts[key] = acc;
    await saveAccounts(accounts);
    return toSession(acc);
  },

  async signInWithProvider() {
    await sleep(400);
    throw authError("provider-unavailable"); // wire up Apple/Google with a real backend
  },

  async sendPasswordReset(email) {
    await sleep(800);
    // A real backend emails a link here. Always succeed so we never reveal which emails exist.
    if (__DEV__) console.log(`[demo] password reset requested for ${email.trim()}`);
  },

  async updatePassword() {
    throw authError("provider-unavailable");
  },

  async signOut() {
    await sleep(150);
  },
};