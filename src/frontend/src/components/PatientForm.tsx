import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import type { Patient } from "../backend.d";

function cmToFeetInches(cm: number): string {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

function feetInchesToCm(str: string): number | null {
  const match = str.match(/(\d+)['\s]*(?:ft)?['\s]*(\d*)["\s]*(?:in)?/i);
  if (!match) return null;
  const feet = Number.parseInt(match[1]) || 0;
  const inches = Number.parseInt(match[2]) || 0;
  const cm = feet * 30.48 + inches * 2.54;
  return cm > 0 ? Math.round(cm * 10) / 10 : null;
}

/** Convert a "YYYY-MM-DD" date string to BigInt nanoseconds safely */
function dobToBigInt(dateStr: string): bigint | null {
  if (!dateStr) return null;
  try {
    const ms = new Date(dateStr).getTime();
    if (Number.isNaN(ms)) return null;
    return BigInt(ms) * 1000000n;
  } catch {
    return null;
  }
}

/** Convert age in years to approximate DOB string (YYYY-01-01) */
function ageToApproxDob(age: string): string {
  const n = Number.parseInt(age);
  if (Number.isNaN(n) || n < 0 || n > 130) return "";
  const year = new Date().getFullYear() - n;
  return `${year}-01-01`;
}

export interface PatientFormData {
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
}

interface PatientFormProps {
  patient?: Patient;
  /** Pre-fill values (used when registering from a confirmed appointment) */
  prefill?: Partial<{
    fullName: string;
    phone: string;
    gender: string;
  }>;
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PatientForm({
  patient,
  prefill,
  onSubmit,
  onCancel,
  isLoading,
}: PatientFormProps) {
  const dob = patient?.dateOfBirth
    ? new Date(Number(patient.dateOfBirth / 1000000n))
        .toISOString()
        .split("T")[0]
    : "";

  const [form, setForm] = useState({
    fullName: patient?.fullName ?? prefill?.fullName ?? "",
    nameBn: patient?.nameBn ?? "",
    dateOfBirth: dob,
    ageInput: "", // alternative age entry
    gender: patient?.gender ?? prefill?.gender ?? "male",
    phone: patient?.phone ?? prefill?.phone ?? "",
    email: patient?.email ?? "",
    address: patient?.address ?? "",
    bloodGroup: patient?.bloodGroup ?? "unknown",
    weight: patient?.weight != null ? String(patient.weight) : "",
    height: patient?.height != null ? cmToFeetInches(patient.height) : "",
    patientType: patient?.patientType ?? "outdoor",
    pastSurgicalHistory: patient?.pastSurgicalHistory ?? "",
  });

  const [allergies, setAllergies] = useState<string[]>(
    patient?.allergies ?? [],
  );
  const [conditions, setConditions] = useState<string[]>(
    patient?.chronicConditions ?? [],
  );
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");

  const set = (key: keyof typeof form, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const addTag = (
    input: string,
    list: string[],
    setter: (v: string[]) => void,
    inputSetter: (v: string) => void,
  ) => {
    const v = input.trim();
    if (v && !list.includes(v)) setter([...list, v]);
    inputSetter("");
  };

  const removeTag = (
    item: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => setter(list.filter((x) => x !== item));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;

    // Determine DOB: prefer explicit date field, fall back to age
    let dobBigInt: bigint | null = dobToBigInt(form.dateOfBirth);
    if (!dobBigInt && form.ageInput.trim()) {
      const approx = ageToApproxDob(form.ageInput.trim());
      dobBigInt = dobToBigInt(approx);
    }

    try {
      onSubmit({
        fullName: form.fullName.trim(),
        nameBn: form.nameBn.trim() || null,
        dateOfBirth: dobBigInt,
        gender: form.gender,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        bloodGroup:
          form.bloodGroup === "unknown" ? null : form.bloodGroup || null,
        weight: form.weight ? Number.parseFloat(form.weight) : null,
        height: form.height ? feetInchesToCm(form.height) : null,
        allergies,
        chronicConditions: conditions,
        pastSurgicalHistory: form.pastSurgicalHistory.trim() || null,
        patientType: form.patientType,
      });
    } catch (err) {
      console.error("PatientForm submit error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Patient full name"
            required
            data-ocid="patient_form.input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nameBn">Bangla Name</Label>
          <Input
            id="nameBn"
            value={form.nameBn}
            onChange={(e) => set("nameBn", e.target.value)}
            placeholder="বাংলা নাম (optional)"
          />
        </div>
      </div>

      {/* DOB + Age + Gender + Patient Type */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => {
              set("dateOfBirth", e.target.value);
              if (e.target.value) set("ageInput", ""); // clear age if DOB set
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ageInput">
            Age (years){" "}
            <span className="text-muted-foreground font-normal text-xs">
              or DOB
            </span>
          </Label>
          <Input
            id="ageInput"
            type="number"
            min="0"
            max="130"
            value={form.ageInput}
            onChange={(e) => {
              set("ageInput", e.target.value);
              if (e.target.value) set("dateOfBirth", ""); // clear DOB if age set
            }}
            placeholder="e.g. 35"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
            <SelectTrigger data-ocid="patient_form.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Patient Type</Label>
          <Select
            value={form.patientType}
            onValueChange={(v) => set("patientType", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outdoor">Outdoor</SelectItem>
              <SelectItem value="admitted">Admitted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+880…"
            type="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="patient@example.com"
            type="email"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Street, City"
          />
        </div>
      </div>

      {/* Clinical */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Blood Group</Label>
          <Select
            value={form.bloodGroup}
            onValueChange={(v) => set("bloodGroup", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "A+",
                "A-",
                "B+",
                "B-",
                "O+",
                "O-",
                "AB+",
                "AB-",
                "unknown",
              ].map((bg) => (
                <SelectItem key={bg} value={bg}>
                  {bg === "unknown" ? "Unknown" : bg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            value={form.weight}
            onChange={(e) => set("weight", e.target.value)}
            placeholder="65"
            type="number"
            step="0.1"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            value={form.height}
            onChange={(e) => set("height", e.target.value)}
            placeholder={"5'8\""}
            type="text"
          />
        </div>
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <Label>Allergies</Label>
        <div className="flex gap-2">
          <Input
            value={allergyInput}
            onChange={(e) => setAllergyInput(e.target.value)}
            placeholder="Add allergy and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(allergyInput, allergies, setAllergies, setAllergyInput);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              addTag(allergyInput, allergies, setAllergies, setAllergyInput)
            }
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {allergies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((a) => (
              <Badge key={a} variant="destructive" className="gap-1 pr-1">
                {a}
                <button
                  type="button"
                  onClick={() => removeTag(a, allergies, setAllergies)}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Chronic Conditions */}
      <div className="space-y-2">
        <Label>Chronic Conditions</Label>
        <div className="flex gap-2">
          <Input
            value={conditionInput}
            onChange={(e) => setConditionInput(e.target.value)}
            placeholder="Add condition and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(
                  conditionInput,
                  conditions,
                  setConditions,
                  setConditionInput,
                );
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              addTag(
                conditionInput,
                conditions,
                setConditions,
                setConditionInput,
              )
            }
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {conditions.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">
                {c}
                <button
                  type="button"
                  onClick={() => removeTag(c, conditions, setConditions)}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Past Surgical History */}
      <div className="space-y-1.5">
        <Label htmlFor="psh">Past Surgical History</Label>
        <Textarea
          id="psh"
          value={form.pastSurgicalHistory}
          onChange={(e) => set("pastSurgicalHistory", e.target.value)}
          placeholder="Any prior surgeries…"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-ocid="patient_form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !form.fullName.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          data-ocid="patient_form.submit_button"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {patient ? "Update Patient" : "Register Patient"}
        </Button>
      </div>
    </form>
  );
}
