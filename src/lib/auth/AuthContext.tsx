import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { supabaseAuthService } from "./supabaseAuthService";
import { AuthService, AuthUser, Session, SignUpInput, SocialProvider } from "./types";

const service: AuthService = supabaseAuthService;

const EMAIL_KEY = "budget-last-email-v1";

type Status = "loading" | "signedOut" | "signedIn";

type AuthValue = {
  status: Status;
  user: AuthUser | null;
  rememberedEmail: string;
  /** Each of these throws an error with a code; show it with authErrorMessage(e). */
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<boolean>;
  signInWithProvider: (provider: SocialProvider, remember: boolean) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [rememberedEmail, setRememberedEmail] = useState("");

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const unsubscribe = service.subscribeToAuthChanges((nextSession) => {
      authEventReceived = true;
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? "signedIn" : "signedOut");
    });

    service
      .getSession()
      .then((restored) => {
        if (active && !authEventReceived) {
          setSession(restored);
          setStatus(restored ? "signedIn" : "signedOut");
        }
      })
      .catch(() => {
        if (active && !authEventReceived) {
          console.warn("Unable to restore the Supabase session.");
          setSession(null);
          setStatus("signedOut");
        }
      });

    AsyncStorage.getItem(EMAIL_KEY)
      .then((email) => {
        if (active && email) setRememberedEmail(email);
      })
      .catch((error: unknown) => {
        console.warn("Unable to load the remembered email.", error);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const finish = useCallback(async (s: Session, remember: boolean) => {
    try {
      if (remember) {
        await AsyncStorage.setItem(EMAIL_KEY, s.user.email);
        setRememberedEmail(s.user.email);
      } else {
        await AsyncStorage.removeItem(EMAIL_KEY);
        setRememberedEmail("");
      }
    } catch (error) {
      console.warn("Unable to update the remembered email.", error);
    }
    setSession(s);
    setStatus("signedIn");
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) =>
      finish(await service.signIn(email.trim(), password), remember),
    [finish]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const signedUpSession = await service.signUp(input);
      if (signedUpSession) {
        await finish(signedUpSession, true);
        return true;
      }
      try {
        await AsyncStorage.setItem(EMAIL_KEY, input.email.trim());
      } catch (error) {
        console.warn("Unable to remember the new account email.", error);
      }
      setRememberedEmail(input.email.trim());
      return false;
    },
    [finish]
  );

  const signInWithProvider = useCallback(
    async (provider: SocialProvider, remember: boolean) =>
      finish(await service.signInWithProvider(provider), remember),
    [finish]
  );

  const sendPasswordReset = useCallback(
    (email: string) => service.sendPasswordReset(email.trim()),
    []
  );

  const updatePassword = useCallback(
    (password: string) => service.updatePassword(password),
    []
  );

  const signOut = useCallback(async () => {
    await service.signOut();
    setSession(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user: session?.user ?? null,
      rememberedEmail,
      signIn,
      signUp,
      signInWithProvider,
      sendPasswordReset,
      updatePassword,
      signOut,
    }),
    [
      status,
      session,
      rememberedEmail,
      signIn,
      signUp,
      signInWithProvider,
      sendPasswordReset,
      updatePassword,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}