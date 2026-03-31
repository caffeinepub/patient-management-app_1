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
const PATIENT_SIGNUP_MAP_KEY = "medicare_patient_signup_map";

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

// ── Sign-up map helpers ───────────────────────────────────────────────────────

export function loadSignUpMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PATIENT_SIGNUP_MAP_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {}
  return {};
}

export function saveSignUpMap(map: Record<string, boolean>) {
  localStorage.setItem(PATIENT_SIGNUP_MAP_KEY, JSON.stringify(map));
}

export function setSignUpEnabled(registerNumber: string, enabled: boolean) {
  const map = loadSignUpMap();
  if (enabled) {
    map[registerNumber] = true;
  } else {
    delete map[registerNumber];
  }
  saveSignUpMap(map);
}

export function isSignUpEnabled(registerNumber: string): boolean {
  const map = loadSignUpMap();
  return map[registerNumber] === true;
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
    registerNumber: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  patientSignIn: (phone: string, password: string) => Promise<void>;
  patientSignOut: () => void;
  getPendingPatients: () => PatientAccount[];
  approvePatient: (id: string) => void;
  rejectPatient: (id: string) => void;
  updatePatientCredentials: (
    registerNumber: string,
    newPhone?: string,
    newPassword?: string,
  ) => void;
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
      registerNumber: string;
      phone: string;
      password: string;
    }) => {
      setIsLoggingIn(true);
      setAuthError(null);
      try {
        const { registerNumber, phone, password } = data;

        if (!registerNumber || !registerNumber.trim()) {
          throw new Error(
            "Register number is required. Please contact the clinic to get your register number.",
          );
        }

        // Find all patient records in localStorage
        const allPatients: any[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("medicare_patients_")) {
            try {
              const arr = JSON.parse(localStorage.getItem(key) || "[]");
              if (Array.isArray(arr)) allPatients.push(...arr);
            } catch {}
          }
        }

        // Verify register number exists in patient records
        const matchedPatient = allPatients.find(
          (p: any) =>
            p.registerNumber &&
            p.registerNumber.trim().toLowerCase() ===
              registerNumber.trim().toLowerCase(),
        );
        if (!matchedPatient) {
          throw new Error(
            "Register number not found. Please contact the clinic to get registered first.",
          );
        }

        // Check if sign-up is enabled for this register number
        if (!isSignUpEnabled(registerNumber.trim())) {
          throw new Error(
            "Your account sign-up has not been activated yet. Please contact the clinic to enable it.",
          );
        }

        // Auto-fill patient details from the record
        const patientName =
          matchedPatient.fullName || matchedPatient.name || "Patient";
        const patientAge = matchedPatient.dateOfBirth
          ? String(
              Math.floor(
                (Date.now() -
                  new Date(
                    Number(
                      typeof matchedPatient.dateOfBirth === "bigint"
                        ? matchedPatient.dateOfBirth / 1000000n
                        : matchedPatient.dateOfBirth,
                    ),
                  ).getTime()) /
                  (365.25 * 24 * 3600 * 1000),
              ),
            )
          : (matchedPatient.age ?? "");
        const patientGender = matchedPatient.gender ?? "";

        const registry = loadPatientRegistry();

        // Check for duplicate by phone
        const existingByPhone = registry.find((p) => p.phone === phone);
        if (existingByPhone) {
          if (existingByPhone.status === "rejected") {
            const idx = registry.findIndex((p) => p.id === existingByPhone.id);
            registry[idx] = {
              ...existingByPhone,
              name: patientName,
              age: patientAge,
              gender: patientGender,
              registerNumber: registerNumber.trim(),
              passwordHash: hashPassword(phone, password),
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

        // Check for duplicate by register number
        const existingByRegNo = registry.find(
          (p) =>
            p.registerNumber?.toLowerCase() ===
            registerNumber.trim().toLowerCase(),
        );
        if (existingByRegNo) {
          if (existingByRegNo.status === "rejected") {
            const idx = registry.findIndex((p) => p.id === existingByRegNo.id);
            registry[idx] = {
              ...existingByRegNo,
              phone,
              name: patientName,
              age: patientAge,
              gender: patientGender,
              passwordHash: hashPassword(phone, password),
              createdAt: new Date().toISOString(),
              status: "pending",
            };
            savePatientRegistry(registry);
            throw new Error(
              "Your account has been re-submitted for approval. Please wait for doctor approval.",
            );
          }
          throw new Error(
            "An account for this register number already exists. Please log in instead.",
          );
        }

        const newPatient: PatientAccount = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          phone,
          passwordHash: hashPassword(phone, password),
          name: patientName,
          age: patientAge,
          gender: patientGender,
          registerNumber: registerNumber.trim(),
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

  const updatePatientCredentials = useCallback(
    (registerNumber: string, newPhone?: string, newPassword?: string) => {
      const registry = loadPatientRegistry();
      const idx = registry.findIndex(
        (p) => p.registerNumber?.toLowerCase() === registerNumber.toLowerCase(),
      );
      if (idx < 0) return;
      const patient = registry[idx];
      const updatedPhone = newPhone?.trim() || patient.phone;
      const updatedHash = newPassword?.trim()
        ? hashPassword(updatedPhone, newPassword.trim())
        : patient.passwordHash;
      registry[idx] = {
        ...patient,
        phone: updatedPhone,
        passwordHash: updatedHash,
      };
      savePatientRegistry(registry);
      // Update current patient state if it's the same account
      setCurrentPatient((prev) => {
        if (prev && prev.registerNumber === registerNumber) {
          return { ...prev, phone: updatedPhone, passwordHash: updatedHash };
        }
        return prev;
      });
    },
    [],
  );

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
        updatePatientCredentials,
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
