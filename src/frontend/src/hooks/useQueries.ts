import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Medication,
  Patient,
  Prescription,
  UserProfile,
  Visit,
  VitalSigns,
} from "../backend.d";

// ─── BigInt serialization helpers ───────────────────────────────────────────

function serializeBigInt(value: unknown): unknown {
  if (typeof value === "bigint") {
    return `__bigint__${value.toString()}`;
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInt);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = serializeBigInt(v);
    }
    return result;
  }
  return value;
}

function deserializeBigInt(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("__bigint__")) {
    return BigInt(value.slice(10));
  }
  if (Array.isArray(value)) {
    return value.map(deserializeBigInt);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = deserializeBigInt(v);
    }
    return result;
  }
  return value;
}

export function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(serializeBigInt(data)));
  } catch (err) {
    console.error("saveToStorage error:", key, err);
    throw err;
  }
}

export function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return deserializeBigInt(JSON.parse(raw)) as T[];
  } catch {
    return [];
  }
}

// ─── Doctor email helper ─────────────────────────────────────────────────────

export function getDoctorEmail(): string {
  try {
    const raw = localStorage.getItem("staff_auth");
    if (!raw) return "default";
    const parsed = JSON.parse(raw);
    return parsed?.email || "default";
  } catch {
    return "default";
  }
}

export function storageKey(prefix: string): string {
  return `${prefix}_${getDoctorEmail()}`;
}

function nextId<T extends { id: bigint }>(items: T[]): bigint {
  if (items.length === 0) return 1n;
  return items.reduce((max, item) => (item.id > max ? item.id : max), 0n) + 1n;
}

// ─── Register number generator ───────────────────────────────────────────────

function generateRegisterNumber(): string {
  const counter =
    Number.parseInt(localStorage.getItem("medicare_register_counter") || "0") +
    1;
  localStorage.setItem("medicare_register_counter", String(counter));
  const year = new Date().getFullYear().toString().slice(-2);
  return `${String(counter).padStart(4, "0")}/${year}`;
}

// ─── Direct patient creation (used by appointment confirmation) ───────────────

export function createPatientInStorage(data: {
  fullName: string;
  phone?: string | null;
  gender?: string;
  dateOfBirth?: bigint | null;
  patientType?: string;
  allergies?: string[];
  chronicConditions?: string[];
}): Patient {
  const key = storageKey("patients");
  const patients = loadFromStorage<Patient>(key);
  // Avoid duplicates (same name + phone)
  const exists = patients.find(
    (p) =>
      p.fullName.toLowerCase() === data.fullName.toLowerCase() &&
      (data.phone ? p.phone === data.phone : true),
  );
  if (exists) return exists;

  const registerNumber = generateRegisterNumber();
  const newPatient = {
    id: nextId(patients),
    fullName: data.fullName,
    phone: data.phone ?? undefined,
    gender: (data.gender ?? "male") as any,
    dateOfBirth: data.dateOfBirth ?? undefined,
    patientType: (data.patientType ?? "outdoor") as any,
    allergies: data.allergies ?? [],
    chronicConditions: data.chronicConditions ?? [],
    createdAt: BigInt(Date.now()) * 1000000n,
    registerNumber,
  } as Patient;
  saveToStorage(key, [...patients, newPatient]);
  return newPatient;
}

// ─── Patients ────────────────────────────────────────────────────────────────

export function useGetAllPatients() {
  return useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      return loadFromStorage<Patient>(storageKey("patients"));
    },
  });
}

export function useGetPatient(id: bigint | null) {
  return useQuery<Patient | null>({
    queryKey: ["patient", id?.toString()],
    queryFn: async () => {
      if (!id) return null;
      const patients = loadFromStorage<Patient>(storageKey("patients"));
      return patients.find((p) => p.id === id) ?? null;
    },
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      nameBn: string | null;
      dateOfBirth: bigint | null;
      gender: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      bloodGroup: string | null;
      weight: number | null;
      height: number | null;
      allergies: string[];
      chronicConditions: string[];
      pastSurgicalHistory: string | null;
      patientType: string;
      photo?: string | null;
    }) => {
      try {
        const key = storageKey("patients");
        const patients = loadFromStorage<Patient>(key);
        const registerNumber = generateRegisterNumber();
        const newPatient: Patient = {
          id: nextId(patients),
          fullName: data.fullName,
          nameBn: data.nameBn ?? undefined,
          dateOfBirth: data.dateOfBirth ?? undefined,
          gender: data.gender as any,
          phone: data.phone ?? undefined,
          email: data.email ?? undefined,
          address: data.address ?? undefined,
          bloodGroup: data.bloodGroup ?? undefined,
          weight: data.weight ?? undefined,
          height: data.height ?? undefined,
          allergies: data.allergies,
          chronicConditions: data.chronicConditions,
          pastSurgicalHistory: data.pastSurgicalHistory ?? undefined,
          patientType: data.patientType as any,
          createdAt: BigInt(Date.now()) * 1000000n,
        } as any;
        (newPatient as any).registerNumber = registerNumber;
        if ((data as any).photo !== undefined) {
          (newPatient as any).photo = (data as any).photo;
        }
        saveToStorage(key, [...patients, newPatient]);
        return newPatient;
      } catch (err) {
        console.error("useCreatePatient error:", err);
        throw new Error("Failed to save patient. Please try again.");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      fullName: string;
      nameBn: string | null;
      dateOfBirth: bigint | null;
      gender: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      bloodGroup: string | null;
      weight: number | null;
      height: number | null;
      allergies: string[];
      chronicConditions: string[];
      pastSurgicalHistory: string | null;
      patientType: string;
    }) => {
      try {
        const key = storageKey("patients");
        const patients = loadFromStorage<Patient>(key);
        const updated = patients.map((p) =>
          p.id === data.id
            ? {
                ...p,
                fullName: data.fullName,
                nameBn: data.nameBn ?? undefined,
                dateOfBirth: data.dateOfBirth ?? undefined,
                gender: data.gender as any,
                phone: data.phone ?? undefined,
                email: data.email ?? undefined,
                address: data.address ?? undefined,
                bloodGroup: data.bloodGroup ?? undefined,
                weight: data.weight ?? undefined,
                height: data.height ?? undefined,
                allergies: data.allergies,
                chronicConditions: data.chronicConditions,
                pastSurgicalHistory: data.pastSurgicalHistory ?? undefined,
                patientType: data.patientType as any,
              }
            : p,
        );
        saveToStorage(key, updated);
        return updated.find((p) => p.id === data.id) as Patient;
      } catch (err) {
        console.error("useUpdatePatient error:", err);
        throw new Error("Failed to update patient. Please try again.");
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", vars.id.toString()] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const key = storageKey("patients");
      const patients = loadFromStorage<Patient>(key);
      saveToStorage(
        key,
        patients.filter((p) => p.id !== id),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

// ─── Visits ──────────────────────────────────────────────────────────────────

export function useGetVisitsByPatient(patientId: bigint | null) {
  return useQuery<Visit[]>({
    queryKey: ["visits", patientId?.toString()],
    queryFn: async () => {
      if (!patientId) return [];
      const visits = loadFromStorage<Visit>(storageKey("visits"));
      return visits.filter((v) => v.patientId === patientId);
    },
    enabled: !!patientId,
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      patientId: bigint;
      visitDate: bigint;
      chiefComplaint: string;
      historyOfPresentIllness: string | null;
      vitalSigns: VitalSigns;
      physicalExamination: string | null;
      diagnosis: string | null;
      notes: string | null;
      visitType: string;
    }) => {
      const key = storageKey("visits");
      const visits = loadFromStorage<Visit>(key);
      const newVisit: Visit = {
        id: nextId(visits),
        patientId: data.patientId,
        visitDate: data.visitDate,
        chiefComplaint: data.chiefComplaint,
        historyOfPresentIllness: data.historyOfPresentIllness ?? undefined,
        vitalSigns: data.vitalSigns,
        physicalExamination: data.physicalExamination ?? undefined,
        diagnosis: data.diagnosis ?? undefined,
        notes: data.notes ?? undefined,
        visitType: data.visitType as any,
        createdAt: BigInt(Date.now()) * 1000000n,
      };
      saveToStorage(key, [...visits, newVisit]);
      return newVisit;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["visits", vars.patientId.toString()] }),
  });
}

export function useDeleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patientId: _patientId,
    }: { id: bigint; patientId: bigint }) => {
      const key = storageKey("visits");
      const visits = loadFromStorage<Visit>(key);
      saveToStorage(
        key,
        visits.filter((v) => v.id !== id),
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["visits", vars.patientId.toString()] }),
  });
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

export function useGetPrescriptionsByPatient(patientId: bigint | null) {
  return useQuery<Prescription[]>({
    queryKey: ["prescriptions", patientId?.toString()],
    queryFn: async () => {
      if (!patientId) return [];
      const prescriptions = loadFromStorage<Prescription>(
        storageKey("prescriptions"),
      );
      return prescriptions.filter((p) => p.patientId === patientId);
    },
    enabled: !!patientId,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      patientId: bigint;
      visitId: bigint | null;
      prescriptionDate: bigint;
      diagnosis: string | null;
      medications: Medication[];
      notes: string | null;
    }) => {
      const key = storageKey("prescriptions");
      const prescriptions = loadFromStorage<Prescription>(key);
      const newPrescription: Prescription = {
        id: nextId(prescriptions),
        patientId: data.patientId,
        visitId: data.visitId ?? undefined,
        prescriptionDate: data.prescriptionDate,
        diagnosis: data.diagnosis ?? undefined,
        medications: data.medications,
        notes: data.notes ?? undefined,
        createdAt: BigInt(Date.now()) * 1000000n,
      };
      saveToStorage(key, [...prescriptions, newPrescription]);
      return newPrescription;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["prescriptions", vars.patientId.toString()],
      }),
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patientId: _patientId,
    }: {
      id: bigint;
      patientId: bigint;
    }) => {
      const key = storageKey("prescriptions");
      const prescriptions = loadFromStorage<Prescription>(key);
      saveToStorage(
        key,
        prescriptions.filter((p) => p.id !== id),
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["prescriptions", vars.patientId.toString()],
      }),
  });
}

// ─── User profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const email = getDoctorEmail();
      const raw = localStorage.getItem(`doctor_profile_${email}`);
      if (!raw) return { name: "" };
      try {
        return JSON.parse(raw) as UserProfile;
      } catch {
        return { name: "" };
      }
    },
  });
}

export function useGetCallerUserRole() {
  return useQuery<string>({
    queryKey: ["userRole"],
    queryFn: async () => {
      return "user";
    },
  });
}

export function useSaveCallerUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const email = getDoctorEmail();
      localStorage.setItem(`doctor_profile_${email}`, JSON.stringify(profile));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}
