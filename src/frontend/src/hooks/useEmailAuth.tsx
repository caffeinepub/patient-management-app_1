import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const REGISTRY_KEY = "medicare_doctors_registry";
const SESSION_KEY = "medicare_current_doctor";

export interface DoctorAccount {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  designation: string;
  degree: string;
  specialization: string;
  hospital: string;
  phone: string;
  createdAt: string;
  role: "doctor" | "staff";
  status: "pending" | "approved" | "rejected";
}

function hashPassword(email: string, password: string): string {
  return btoa(`${email.toLowerCase()}::${password}`);
}

export function loadRegistry(): DoctorAccount[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as any[];
      // Backfill existing accounts with defaults
      return parsed.map((d) => ({
        ...d,
        role: d.role ?? "doctor",
        status: d.status ?? "approved",
      }));
    }
  } catch {}
  return [];
}

export function saveRegistry(registry: DoctorAccount[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

interface EmailAuthContextValue {
  currentDoctor: DoctorAccount | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  signUp: (
    data: Omit<
      DoctorAccount,
      "id" | "passwordHash" | "createdAt" | "status"
    > & {
      password: string;
    },
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (
    data: Partial<Omit<DoctorAccount, "id" | "passwordHash" | "createdAt">>,
  ) => void;
  getPendingAccounts: () => DoctorAccount[];
  approveAccount: (id: string) => void;
  rejectAccount: (id: string) => void;
}

const EmailAuthContext = createContext<EmailAuthContextValue | null>(null);

export function EmailAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentDoctor, setCurrentDoctor] = useState<DoctorAccount | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(SESSION_KEY);
    if (id) {
      const registry = loadRegistry();
      const doctor = registry.find((d) => d.id === id) ?? null;
      setCurrentDoctor(doctor);
    }
    setIsInitializing(false);
  }, []);

  const signUp = useCallback(
    async (
      data: Omit<
        DoctorAccount,
        "id" | "passwordHash" | "createdAt" | "status"
      > & {
        password: string;
      },
    ) => {
      setIsLoggingIn(true);
      setAuthError(null);
      try {
        const registry = loadRegistry();
        const existing = registry.find(
          (d) => d.email.toLowerCase() === data.email.toLowerCase(),
        );
        if (existing) {
          if (existing.status === "rejected") {
            // Allow re-registration: overwrite rejected account
            const idx = registry.findIndex((d) => d.id === existing.id);
            const { password, ...rest } = data;
            registry[idx] = {
              ...rest,
              id: existing.id,
              passwordHash: hashPassword(data.email, password),
              createdAt: new Date().toISOString(),
              status: "pending",
            };
            saveRegistry(registry);
            throw new Error(
              "Your account has been re-submitted for approval. Please wait for admin approval.",
            );
          }
          throw new Error("An account with this email already exists.");
        }
        const { password, ...rest } = data;
        const newDoctor: DoctorAccount = {
          ...rest,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          passwordHash: hashPassword(data.email, password),
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        registry.push(newDoctor);
        saveRegistry(registry);
        // Do NOT auto-login — account is pending
        throw new Error(
          "Account created! Please wait for admin approval before logging in.",
        );
      } catch (e: any) {
        setAuthError(e.message ?? "Sign up failed.");
        throw e;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const registry = loadRegistry();
      const doctor = registry.find(
        (d) => d.email.toLowerCase() === email.toLowerCase(),
      );
      if (!doctor) throw new Error("No account found with this email.");
      if (doctor.passwordHash !== hashPassword(email, password))
        throw new Error("Incorrect password.");
      if (doctor.status === "pending")
        throw new Error("Your account is pending admin approval. Please wait.");
      if (doctor.status === "rejected")
        throw new Error(
          "Your account has been rejected. Please contact the admin or re-register.",
        );
      localStorage.setItem(SESSION_KEY, doctor.id);
      setCurrentDoctor(doctor);
    } catch (e: any) {
      setAuthError(e.message ?? "Sign in failed.");
      throw e;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentDoctor(null);
    setAuthError(null);
  }, []);

  const updateProfile = useCallback(
    (
      data: Partial<Omit<DoctorAccount, "id" | "passwordHash" | "createdAt">>,
    ) => {
      if (!currentDoctor) return;
      const registry = loadRegistry();
      const idx = registry.findIndex((d) => d.id === currentDoctor.id);
      if (idx < 0) return;
      const updated = { ...registry[idx], ...data };
      registry[idx] = updated;
      saveRegistry(registry);
      setCurrentDoctor(updated);
    },
    [currentDoctor],
  );

  const getPendingAccounts = useCallback((): DoctorAccount[] => {
    return loadRegistry().filter((d) => d.status === "pending");
  }, []);

  const approveAccount = useCallback((id: string) => {
    const registry = loadRegistry();
    const idx = registry.findIndex((d) => d.id === id);
    if (idx >= 0) {
      registry[idx] = { ...registry[idx], status: "approved" };
      saveRegistry(registry);
    }
  }, []);

  const rejectAccount = useCallback((id: string) => {
    const registry = loadRegistry();
    const idx = registry.findIndex((d) => d.id === id);
    if (idx >= 0) {
      registry[idx] = { ...registry[idx], status: "rejected" };
      saveRegistry(registry);
    }
  }, []);

  return (
    <EmailAuthContext.Provider
      value={{
        currentDoctor,
        isInitializing,
        isLoggingIn,
        authError,
        signUp,
        signIn,
        signOut,
        updateProfile,
        getPendingAccounts,
        approveAccount,
        rejectAccount,
      }}
    >
      {children}
    </EmailAuthContext.Provider>
  );
}

export function useEmailAuth(): EmailAuthContextValue {
  const ctx = useContext(EmailAuthContext);
  if (!ctx)
    throw new Error("useEmailAuth must be used inside EmailAuthProvider");
  return ctx;
}
