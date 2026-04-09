// ─── Domain types for Dr. Arman Kabir's Care ─────────────────────────────────
// These types were previously imported from backend.d which is a protected stub.
// All domain types live here.

export type Gender = "male" | "female" | "other";

export interface VitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  oxygenSaturation?: string;
  respiratoryRate?: string;
  weight?: string;
  height?: string;
  [key: string]: string | undefined;
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
  drugForm?: string;
  drugName?: string;
  route?: string;
  routeBn?: string;
  frequencyBn?: string;
  durationBn?: string;
  instructionsBn?: string;
  specialInstruction?: string;
  specialInstructionBn?: string;
  [key: string]: string | undefined;
}

export interface Patient {
  id: bigint;
  fullName: string;
  nameBn?: string;
  dateOfBirth?: bigint;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  weight?: number;
  height?: number;
  allergies: string[];
  chronicConditions: string[];
  pastSurgicalHistory?: string;
  patientType: "outdoor" | "indoor" | "emergency";
  createdAt: bigint;
  registerNumber?: string;
  photo?: string;
  [key: string]: unknown;
}

export interface Visit {
  id: bigint;
  patientId: bigint;
  visitDate: bigint;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  vitalSigns: VitalSigns;
  physicalExamination?: string;
  diagnosis?: string;
  notes?: string;
  visitType:
    | "outpatient"
    | "inpatient"
    | "emergency"
    | "follow-up"
    | "admitted";
  createdAt: bigint;
  [key: string]: unknown;
}

export interface Prescription {
  id: bigint;
  patientId: bigint;
  visitId?: bigint;
  prescriptionDate: bigint;
  diagnosis?: string;
  medications: Medication[];
  notes?: string;
  createdAt: bigint;
  [key: string]: unknown;
}

export interface UserProfile {
  name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  address?: string;
  photo?: string;
  [key: string]: unknown;
}

// Appointment type
export interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  phone: string;
  registerNumber?: string;
  preferredDoctor: string;
  preferredChamber?: string;
  preferredDate: string;
  preferredTime: string;
  reason?: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

// Serial Queue
export interface SerialEntry {
  id: string;
  serialNumber: number;
  patientName: string;
  phone?: string;
  status: "waiting" | "current" | "done" | "skipped";
  addedAt: string;
  calledAt?: string;
}
