import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Medication } from "../backend.d";

interface PrescriptionFormProps {
  patientId: bigint;
  visitId?: bigint;
  onSubmit: (data: {
    patientId: bigint;
    visitId: bigint | null;
    prescriptionDate: bigint;
    diagnosis: string | null;
    medications: Medication[];
    notes: string | null;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface MedEntry {
  _uid: number;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

let _counter = 0;
function nextUid() {
  _counter += 1;
  return _counter;
}

function emptyMed(): MedEntry {
  return {
    _uid: nextUid(),
    name: "",
    dose: "",
    frequency: "",
    duration: "",
    instructions: "",
  };
}

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

export default function PrescriptionForm({
  patientId,
  visitId,
  onSubmit,
  onCancel,
  isLoading,
}: PrescriptionFormProps) {
  const [prescriptionDate, setPrescriptionDate] = useState(todayDateString());
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<MedEntry[]>([emptyMed()]);

  const addMed = () => setMedications((prev) => [...prev, emptyMed()]);

  const removeMed = (uid: number) =>
    setMedications((prev) => prev.filter((m) => m._uid !== uid));

  const updateMed = (
    uid: number,
    field: keyof Omit<MedEntry, "_uid">,
    value: string,
  ) =>
    setMedications((prev) =>
      prev.map((m) => (m._uid === uid ? { ...m, [field]: value } : m)),
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validMeds: Medication[] = medications
      .filter((m) => m.name.trim())
      .map(({ name, dose, frequency, duration, instructions }) => ({
        name: name.trim(),
        dose: dose.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
        instructions: instructions.trim(),
      }));
    const date = BigInt(new Date(prescriptionDate).getTime()) * 1000000n;

    onSubmit({
      patientId,
      visitId: visitId ?? null,
      prescriptionDate: date,
      diagnosis: diagnosis.trim() || null,
      medications: validMeds,
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="rxDate">Prescription Date</Label>
          <Input
            id="rxDate"
            type="date"
            value={prescriptionDate}
            onChange={(e) => setPrescriptionDate(e.target.value)}
            data-ocid="prescription_form.input"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rxDx">Diagnosis</Label>
          <Input
            id="rxDx"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute pharyngitis"
          />
        </div>
      </div>

      {/* Medications */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Medications</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMed}
            className="h-7 px-2 text-xs gap-1"
            data-ocid="prescription_form.secondary_button"
          >
            <Plus className="w-3 h-3" />
            Add Medication
          </Button>
        </div>

        <div className="space-y-4">
          {medications.map((med, idx) => (
            <div
              key={med._uid}
              className="bg-muted/40 rounded-lg p-3 space-y-2 relative"
            >
              {medications.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeMed(med._uid)}
                  data-ocid={`prescription_form.delete_button.${idx + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Drug Name *</Label>
                  <Input
                    value={med.name}
                    onChange={(e) =>
                      updateMed(med._uid, "name", e.target.value)
                    }
                    placeholder="e.g. Amoxicillin"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dose</Label>
                  <Input
                    value={med.dose}
                    onChange={(e) =>
                      updateMed(med._uid, "dose", e.target.value)
                    }
                    placeholder="e.g. 500mg"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frequency</Label>
                  <Input
                    value={med.frequency}
                    onChange={(e) =>
                      updateMed(med._uid, "frequency", e.target.value)
                    }
                    placeholder="e.g. Twice daily"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Input
                    value={med.duration}
                    onChange={(e) =>
                      updateMed(med._uid, "duration", e.target.value)
                    }
                    placeholder="e.g. 7 days"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Instructions</Label>
                  <Input
                    value={med.instructions}
                    onChange={(e) =>
                      updateMed(med._uid, "instructions", e.target.value)
                    }
                    placeholder="e.g. Take after meals"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="rxNotes">Notes</Label>
        <Textarea
          id="rxNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Additional instructions…"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-ocid="prescription_form.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90"
          data-ocid="prescription_form.submit_button"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Prescription
        </Button>
      </div>
    </form>
  );
}
