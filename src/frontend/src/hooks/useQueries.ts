import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Medication,
  Patient,
  Prescription,
  UserProfile,
  Visit,
  VitalSigns,
} from "../backend.d";
import { useActor } from "./useActor";

// ─── Patients ───────────────────────────────────────────────────────────────

export function useGetAllPatients() {
  const { actor, isFetching } = useActor();
  return useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPatients();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPatient(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Patient | null>({
    queryKey: ["patient", id?.toString()],
    queryFn: async () => {
      if (!actor || !id) return null;
      return actor.getPatient(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreatePatient() {
  const { actor } = useActor();
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
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createPatient(
        data.fullName,
        data.nameBn,
        data.dateOfBirth,
        data.gender as any,
        data.phone,
        data.email,
        data.address,
        data.bloodGroup,
        data.weight,
        data.height,
        data.allergies,
        data.chronicConditions,
        data.pastSurgicalHistory,
        data.patientType as any,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const { actor } = useActor();
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
      if (!actor) throw new Error("Not connected");
      return actor.updatePatient(
        data.id,
        data.fullName,
        data.nameBn,
        data.dateOfBirth,
        data.gender as any,
        data.phone,
        data.email,
        data.address,
        data.bloodGroup,
        data.weight,
        data.height,
        data.allergies,
        data.chronicConditions,
        data.pastSurgicalHistory,
        data.patientType as any,
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", vars.id.toString()] });
    },
  });
}

export function useDeletePatient() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePatient(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

// ─── Visits ──────────────────────────────────────────────────────────────────

export function useGetVisitsByPatient(patientId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Visit[]>({
    queryKey: ["visits", patientId?.toString()],
    queryFn: async () => {
      if (!actor || !patientId) return [];
      return actor.getVisitsByPatientId(patientId);
    },
    enabled: !!actor && !isFetching && !!patientId,
  });
}

export function useCreateVisit() {
  const { actor } = useActor();
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
      if (!actor) throw new Error("Not connected");
      return actor.createVisit(
        data.patientId,
        data.visitDate,
        data.chiefComplaint,
        data.historyOfPresentIllness,
        data.vitalSigns,
        data.physicalExamination,
        data.diagnosis,
        data.notes,
        data.visitType as any,
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["visits", vars.patientId.toString()] }),
  });
}

export function useDeleteVisit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patientId: _patientId,
    }: { id: bigint; patientId: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteVisit(id);
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["visits", vars.patientId.toString()] }),
  });
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

export function useGetPrescriptionsByPatient(patientId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Prescription[]>({
    queryKey: ["prescriptions", patientId?.toString()],
    queryFn: async () => {
      if (!actor || !patientId) return [];
      return actor.getPrescriptionsByPatientId(patientId);
    },
    enabled: !!actor && !isFetching && !!patientId,
  });
}

export function useCreatePrescription() {
  const { actor } = useActor();
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
      if (!actor) throw new Error("Not connected");
      return actor.createPrescription(
        data.patientId,
        data.visitId,
        data.prescriptionDate,
        data.diagnosis,
        data.medications,
        data.notes,
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["prescriptions", vars.patientId.toString()],
      }),
  });
}

export function useDeletePrescription() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patientId: _patientId,
    }: {
      id: bigint;
      patientId: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePrescription(id);
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({
        queryKey: ["prescriptions", vars.patientId.toString()],
      }),
  });
}

// ─── User profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["userRole"],
    queryFn: async () => {
      if (!actor) return "guest";
      return actor.getCallerUserRole() as any;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userProfile"] }),
  });
}
