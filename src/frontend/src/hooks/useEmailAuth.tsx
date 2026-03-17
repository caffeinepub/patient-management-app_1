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
}

function hashPassword(email: string, password: string): string {
  return btoa(`${email.toLowerCase()}::${password}`);
}

function loadRegistry(): DoctorAccount[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveRegistry(registry: DoctorAccount[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

interface EmailAuthContextValue {
  currentDoctor: DoctorAccount | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  signUp: (
    data: Omit<DoctorAccount, "id" | "passwordHash" | "createdAt"> & {
      password: string;
    },
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (
    data: Partial<Omit<DoctorAccount, "id" | "passwordHash" | "createdAt">>,
  ) => void;
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
      data: Omit<DoctorAccount, "id" | "passwordHash" | "createdAt"> & {
        password: string;
      },
    ) => {
      setIsLoggingIn(true);
      setAuthError(null);
      try {
        const registry = loadRegistry();
        if (
          registry.find(
            (d) => d.email.toLowerCase() === data.email.toLowerCase(),
          )
        ) {
          throw new Error("An account with this email already exists.");
        }
        const { password, ...rest } = data;
        const newDoctor: DoctorAccount = {
          ...rest,
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          passwordHash: hashPassword(data.email, password),
          createdAt: new Date().toISOString(),
        };
        registry.push(newDoctor);
        saveRegistry(registry);
        localStorage.setItem(SESSION_KEY, newDoctor.id);
        setCurrentDoctor(newDoctor);
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
