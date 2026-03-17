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

interface PatientFormData {
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
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PatientForm({
  patient,
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
    fullName: patient?.fullName ?? "",
    nameBn: patient?.nameBn ?? "",
    dateOfBirth: dob,
    gender: patient?.gender ?? "male",
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    address: patient?.address ?? "",
    bloodGroup: patient?.bloodGroup ?? "unknown",
    weight: patient?.weight != null ? String(patient.weight) : "",
    height: patient?.height != null ? String(patient.height) : "",
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
    const dobMs = form.dateOfBirth
      ? BigInt(new Date(form.dateOfBirth).getTime()) * 1000000n
      : null;
    onSubmit({
      fullName: form.fullName.trim(),
      nameBn: form.nameBn.trim() || null,
      dateOfBirth: dobMs,
      gender: form.gender,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      bloodGroup:
        form.bloodGroup === "unknown" ? null : form.bloodGroup || null,
      weight: form.weight ? Number.parseFloat(form.weight) : null,
      height: form.height ? Number.parseFloat(form.height) : null,
      allergies,
      chronicConditions: conditions,
      pastSurgicalHistory: form.pastSurgicalHistory.trim() || null,
      patientType: form.patientType,
    });
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

      {/* DOB, Gender, Patient Type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
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
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            value={form.height}
            onChange={(e) => set("height", e.target.value)}
            placeholder="170"
            type="number"
            step="0.1"
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
