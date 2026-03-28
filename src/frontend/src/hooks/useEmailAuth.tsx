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
const PATIENT_REGISTRY_KEY = "medicare_patients_auth_registry";
const PATIENT_SESSION_KEY = "medicare_patient_session";
const AUDIT_LOG_KEY = "medicare_audit_log";

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

export interface PatientAccount {
  id: string;
  phone: string;
  passwordHash: string;
  name: string;
  age?: string;
  gender?: string;
  registerNumber?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userRole: "admin" | "doctor" | "staff" | "patient";
  userName: string;
  action: string;
  target: string;
}

function hashPassword(key: string, password: string): string {
  return btoa(`${key.toLowerCase()}::${password}`);
}

export function loadRegistry(): DoctorAccount[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as any[];
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

export function loadPatientRegistry(): PatientAccount[] {
  try {
    const raw = localStorage.getItem(PATIENT_REGISTRY_KEY);
    if (raw) return JSON.parse(raw) as PatientAccount[];
  } catch {}
  return [];
}

export function savePatientRegistry(registry: PatientAccount[]) {
  localStorage.setItem(PATIENT_REGISTRY_KEY, JSON.stringify(registry));
}

export function appendAuditLog(entry: Omit<AuditLogEntry, "id">) {
  try {
    const logs = getAuditLog();
    logs.push({
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    });
    // Keep last 1000 entries
    const trimmed = logs.slice(-1000);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getAuditLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    if (raw) return JSON.parse(raw) as AuditLogEntry[];
  } catch {}
  return [];
}

interface EmailAuthContextValue {
  currentDoctor: DoctorAccount | null;
  currentPatient: PatientAccount | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  signUp: (
    data: Omit<
      DoctorAccount,
      "id" | "passwordHash" | "createdAt" | "status"
    > & { password: string },
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (
    data: Partial<Omit<DoctorAccount, "id" | "passwordHash" | "createdAt">>,
  ) => void;
  getPendingAccounts: () => DoctorAccount[];
  approveAccount: (id: string) => void;
  rejectAccount: (id: string) => void;
  // Patient auth
  patientSignUp: (data: {
    name: string;
    phone: string;
    password: string;
    age?: string;
    gender?: string;
    registerNumber?: string;
  }) => Promise<void>;
  patientSignIn: (phone: string, password: string) => Promise<void>;
  patientSignOut: () => void;
  getPendingPatients: () => PatientAccount[];
  approvePatient: (id: string) => void;
  rejectPatient: (id: string) => void;
}

const EmailAuthContext = createContext<EmailAuthContextValue | null>(null);

export function EmailAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentDoctor, setCurrentDoctor] = useState<DoctorAccount | null>(
    null,
  );
  const [currentPatient, setCurrentPatient] = useState<PatientAccount | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const doctorId = localStorage.getItem(SESSION_KEY);
    if (doctorId) {
      const registry = loadRegistry();
      const doctor = registry.find((d) => d.id === doctorId) ?? null;
      setCurrentDoctor(doctor);
    }
    const patientId = localStorage.getItem(PATIENT_SESSION_KEY);
    if (patientId) {
      const registry = loadPatientRegistry();
      const patient = registry.find((p) => p.id === patientId) ?? null;
      setCurrentPatient(patient);
    }
    setIsInitializing(false);
  }, []);

  const signUp = useCallback(
    async (
      data: Omit<
        DoctorAccount,
        "id" | "passwordHash" | "createdAt" | "status"
      > & { password: string },
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
      appendAuditLog({
        timestamp: new Date().toISOString(),
        userRole: doctor.role,
        userName: doctor.name,
        action: "Logged in",
        target: "System",
      });
    } catch (e: any) {
      setAuthError(e.message ?? "Sign in failed.");
      throw e;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    if (currentDoctor) {
      appendAuditLog({
        timestamp: new Date().toISOString(),
        userRole: currentDoctor.role,
        userName: currentDoctor.name,
        action: "Logged out",
        target: "System",
      });
    }
    localStorage.removeItem(SESSION_KEY);
    setCurrentDoctor(null);
    setAuthError(null);
  }, [currentDoctor]);

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

  // ── Patient auth ──────────────────────────────────────────────────────────

  const patientSignUp = useCallback(
    async (data: {
      name: string;
      phone: string;
      password: string;
      age?: string;
      gender?: string;
      registerNumber?: string;
    }) => {
      setIsLoggingIn(true);
      setAuthError(null);
      try {
        const registry = loadPatientRegistry();
        const existing = registry.find((p) => p.phone === data.phone);
        if (existing) {
          if (existing.status === "rejected") {
            const idx = registry.findIndex((p) => p.id === existing.id);
            registry[idx] = {
              ...existing,
              name: data.name,
              age: data.age,
              gender: data.gender,
              registerNumber: data.registerNumber,
              passwordHash: hashPassword(data.phone, data.password),
              createdAt: new Date().toISOString(),
              status: "pending",
            };
            savePatientRegistry(registry);
            throw new Error(
              "Your account has been re-submitted for approval. Please wait for doctor approval.",
            );
          }
          throw new Error("An account with this phone number already exists.");
        }
        const newPatient: PatientAccount = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          phone: data.phone,
          passwordHash: hashPassword(data.phone, data.password),
          name: data.name,
          age: data.age,
          gender: data.gender,
          registerNumber: data.registerNumber,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        registry.push(newPatient);
        savePatientRegistry(registry);
        throw new Error(
          "Account created! Please wait for doctor approval before logging in.",
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

  const patientSignIn = useCallback(async (phone: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const registry = loadPatientRegistry();
      const patient = registry.find((p) => p.phone === phone);
      if (!patient) throw new Error("No account found with this phone number.");
      if (patient.passwordHash !== hashPassword(phone, password))
        throw new Error("Incorrect password.");
      if (patient.status === "pending")
        throw new Error(
          "Your account is pending doctor approval. Please wait.",
        );
      if (patient.status === "rejected")
        throw new Error(
          "Your account has been rejected. Please contact your doctor.",
        );
      localStorage.setItem(PATIENT_SESSION_KEY, patient.id);
      setCurrentPatient(patient);
      appendAuditLog({
        timestamp: new Date().toISOString(),
        userRole: "patient",
        userName: patient.name,
        action: "Logged in",
        target: "Patient Portal",
      });
    } catch (e: any) {
      setAuthError(e.message ?? "Sign in failed.");
      throw e;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const patientSignOut = useCallback(() => {
    if (currentPatient) {
      appendAuditLog({
        timestamp: new Date().toISOString(),
        userRole: "patient",
        userName: currentPatient.name,
        action: "Logged out",
        target: "Patient Portal",
      });
    }
    localStorage.removeItem(PATIENT_SESSION_KEY);
    setCurrentPatient(null);
    setAuthError(null);
  }, [currentPatient]);

  const getPendingPatients = useCallback((): PatientAccount[] => {
    return loadPatientRegistry().filter((p) => p.status === "pending");
  }, []);

  const approvePatient = useCallback((id: string) => {
    const registry = loadPatientRegistry();
    const idx = registry.findIndex((p) => p.id === id);
    if (idx >= 0) {
      registry[idx] = { ...registry[idx], status: "approved" };
      savePatientRegistry(registry);
    }
  }, []);

  const rejectPatient = useCallback((id: string) => {
    const registry = loadPatientRegistry();
    const idx = registry.findIndex((p) => p.id === id);
    if (idx >= 0) {
      registry[idx] = { ...registry[idx], status: "rejected" };
      savePatientRegistry(registry);
    }
  }, []);

  return (
    <EmailAuthContext.Provider
      value={{
        currentDoctor,
        currentPatient,
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
        patientSignUp,
        patientSignIn,
        patientSignOut,
        getPendingPatients,
        approvePatient,
        rejectPatient,
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
