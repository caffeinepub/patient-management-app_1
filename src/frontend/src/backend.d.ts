import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Medication {
    duration: string;
    dose: string;
    name: string;
    instructions: string;
    frequency: string;
}
export interface CurrentUser {
    principal: Principal;
    role: UserRole;
}
export type Time = bigint;
export interface VitalSigns {
    respiratoryRate?: string;
    temperature?: string;
    bloodPressure?: string;
    oxygenSaturation?: string;
    pulse?: string;
}
export interface Prescription {
    id: bigint;
    patientId: bigint;
    createdAt: Time;
    diagnosis?: string;
    prescriptionDate: Time;
    medications: Array<Medication>;
    notes?: string;
    visitId?: bigint;
}
export interface Visit {
    id: bigint;
    vitalSigns: VitalSigns;
    patientId: bigint;
    createdAt: Time;
    visitDate: Time;
    visitType: VisitType;
    diagnosis?: string;
    historyOfPresentIllness?: string;
    notes?: string;
    physicalExamination?: string;
    chiefComplaint: string;
}
export interface UserProfile {
    name: string;
}
export interface Patient {
    id: bigint;
    weight?: number;
    height?: number;
    nameBn?: string;
    dateOfBirth?: Time;
    createdAt: Time;
    fullName: string;
    email?: string;
    pastSurgicalHistory?: string;
    bloodGroup?: string;
    address?: string;
    gender: Gender;
    patientType: PatientType;
    chronicConditions: Array<string>;
    phone?: string;
    allergies: Array<string>;
}
export enum Gender {
    other = "other",
    female = "female",
    male = "male"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum VisitType {
    admitted = "admitted",
    outdoor = "outdoor"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPatient(fullName: string, nameBn: string | null, dateOfBirth: Time | null, gender: Gender, phone: string | null, email: string | null, address: string | null, bloodGroup: string | null, weight: number | null, height: number | null, allergies: Array<string>, chronicConditions: Array<string>, pastSurgicalHistory: string | null, patientType: PatientType): Promise<Patient>;
    createPrescription(patientId: bigint, visitId: bigint | null, prescriptionDate: Time, diagnosis: string | null, medications: Array<Medication>, notes: string | null): Promise<Prescription>;
    createVisit(patientId: bigint, visitDate: Time, chiefComplaint: string, historyOfPresentIllness: string | null, vitalSigns: VitalSigns, physicalExamination: string | null, diagnosis: string | null, notes: string | null, visitType: VisitType): Promise<Visit>;
    deletePatient(id: bigint): Promise<void>;
    deletePrescription(id: bigint): Promise<void>;
    deleteVisit(id: bigint): Promise<void>;
    getAllPatients(): Promise<Array<Patient>>;
    getAllPrescriptions(): Promise<Array<Prescription>>;
    getAllVisits(): Promise<Array<Visit>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentUser(): Promise<CurrentUser>;
    getPatient(id: bigint): Promise<Patient | null>;
    getPrescription(id: bigint): Promise<Prescription | null>;
    getPrescriptionsByPatientId(patientId: bigint): Promise<Array<Prescription>>;
    getPrescriptionsByVisitId(visitId: bigint): Promise<Array<Prescription>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVisit(id: bigint): Promise<Visit | null>;
    getVisitsByPatientId(patientId: bigint): Promise<Array<Visit>>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updatePatient(id: bigint, fullName: string, nameBn: string | null, dateOfBirth: Time | null, gender: Gender, phone: string | null, email: string | null, address: string | null, bloodGroup: string | null, weight: number | null, height: number | null, allergies: Array<string>, chronicConditions: Array<string>, pastSurgicalHistory: string | null, patientType: PatientType): Promise<Patient>;
    updatePrescription(id: bigint, patientId: bigint, visitId: bigint | null, prescriptionDate: Time, diagnosis: string | null, medications: Array<Medication>, notes: string | null): Promise<Prescription>;
    updateVisit(id: bigint, patientId: bigint, visitDate: Time, chiefComplaint: string, historyOfPresentIllness: string | null, vitalSigns: VitalSigns, physicalExamination: string | null, diagnosis: string | null, notes: string | null, visitType: VisitType): Promise<Visit>;
}
