import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { loadFromStorage, storageKey } from "@/hooks/useQueries";
import { AlertTriangle, Phone, Send } from "lucide-react";
import { useState } from "react";
import type { Patient } from "../backend.d";

const WHATSAPP_NUMBERS: Record<string, string> = {
  arman: "8801751959262",
  samia: "8801957212210",
};

const DOCTOR_LABELS: Record<string, string> = {
  arman: "Dr. Arman Kabir",
  samia: "Dr. Samia Shikder",
};

function findPatientByRegNumber(regNum: string): Patient | null {
  try {
    // Try all doctor emails stored in registry
    const registry = JSON.parse(
      localStorage.getItem("medicare_doctors_registry") || "[]",
    );
    for (const doc of registry) {
      const key = `patients_${doc.email}`;
      const patients = loadFromStorage<Patient>(key);
      const found = patients.find(
        (p) =>
          (p as any).registerNumber?.toUpperCase() === regNum.toUpperCase(),
      );
      if (found) return found;
    }
    // Also try default key
    const patients = loadFromStorage<Patient>(storageKey("patients"));
    const found = patients.find(
      (p) => (p as any).registerNumber?.toUpperCase() === regNum.toUpperCase(),
    );
    if (found) return found;
  } catch {}
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EmergencyConsultationModal({ open, onClose }: Props) {
  const [registerNumber, setRegisterNumber] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [doctor, setDoctor] = useState("");
  const [error, setError] = useState("");
  const [regLookupMsg, setRegLookupMsg] = useState("");

  const handleRegLookup = (val: string) => {
    setRegisterNumber(val);
    if (!val.trim()) {
      setRegLookupMsg("");
      return;
    }
    const patient = findPatientByRegNumber(val.trim());
    if (patient) {
      setName(patient.fullName);
      if (patient.dateOfBirth) {
        const ageYrs = Math.floor(
          (Date.now() - Number(patient.dateOfBirth / 1000000n)) /
            (365.25 * 24 * 3600 * 1000),
        );
        setAge(String(ageYrs));
      }
      setRegLookupMsg(`\u2713 Found: ${patient.fullName}`);
    } else {
      setRegLookupMsg("Patient not found with this register number.");
    }
  };

  const handleSend = () => {
    if (!name.trim() || !age || !symptoms.trim() || !doctor) {
      setError("Please fill in all fields before sending.");
      return;
    }
    setError("");
    const number = WHATSAPP_NUMBERS[doctor];
    const docName = DOCTOR_LABELS[doctor];
    const regPart = registerNumber ? `\nReg. No.: ${registerNumber}` : "";
    const message = `\ud83d\udea8 Emergency Consultation Request\n\nDoctor: ${docName}\nName: ${name}${regPart}\nAge: ${age}\nSymptoms: ${symptoms}\n\nSent from Dr. Arman Kabir's Care portal.`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setRegisterNumber("");
    setName("");
    setAge("");
    setSymptoms("");
    setDoctor("");
    setRegLookupMsg("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="emergency.dialog">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle className="text-destructive text-lg font-bold">
              Emergency Consultation
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Fill in your details and we will connect you with a doctor via
            WhatsApp immediately.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Register number lookup */}
          <div className="space-y-1.5">
            <Label htmlFor="em-regnum">Register Number (optional)</Label>
            <Input
              id="em-regnum"
              placeholder="e.g. REG-0001/26"
              value={registerNumber}
              onChange={(e) => handleRegLookup(e.target.value)}
              data-ocid="emergency.input"
            />
            {regLookupMsg && (
              <p
                className={`text-xs ${
                  regLookupMsg.startsWith("\u2713")
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {regLookupMsg}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="em-name">Patient Name *</Label>
            <Input
              id="em-name"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ocid="emergency.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-age">Age *</Label>
            <Input
              id="em-age"
              type="number"
              placeholder="Age in years"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={0}
              max={120}
              data-ocid="emergency.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Select Doctor *</Label>
            <Select value={doctor} onValueChange={setDoctor}>
              <SelectTrigger data-ocid="emergency.select">
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arman">Dr. Arman Kabir</SelectItem>
                <SelectItem value="samia">Dr. Samia Shikder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-symptoms">Symptoms / Complaint *</Label>
            <Textarea
              id="em-symptoms"
              placeholder="Describe your emergency symptoms briefly..."
              rows={3}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              data-ocid="emergency.textarea"
            />
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="emergency.error_state"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-ocid="emergency.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white gap-2"
              onClick={handleSend}
              data-ocid="emergency.submit_button"
            >
              <Send className="w-4 h-4" />
              Send via WhatsApp
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Phone className="w-3 h-3 shrink-0" />
            <span>
              This will open WhatsApp with a pre-filled message to the selected
              doctor&apos;s number.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
