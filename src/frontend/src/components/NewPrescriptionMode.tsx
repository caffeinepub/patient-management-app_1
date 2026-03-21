import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  Info,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Medication } from "../backend.d";
import { type DimsEntry, getDimsByDiagnosis, searchDims } from "./DimsData";

// ─── Types ────────────────────────────────────────────────────────────────────

type DrugType = "TAB." | "SYP." | "INJ." | "INF." | "SUPP." | "";
type NameType = "generic" | "brand";

interface MedEntry {
  _uid: number;
  drugType: DrugType;
  nameType: NameType;
  name: string;
  dose: string;
  frequency: string;
  frequencyOther: string;
  durationEn: string;
  durationBn: string;
  instructionEn: string;
  instructionBn: string;
  fromDims: boolean;
  originalDims?: Partial<MedEntry>;
}

interface NewPrescriptionModeProps {
  patientId: bigint;
  visitId?: bigint;
  patientName?: string;
  initialDiagnosis?: string;
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

// ─── Constants ─────────────────────────────────────────────────────────────

const DRUG_TYPES: { label: DrugType; color: string }[] = [
  { label: "TAB.", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { label: "SYP.", color: "bg-green-100 text-green-800 border-green-300" },
  { label: "INJ.", color: "bg-red-100 text-red-800 border-red-300" },
  { label: "INF.", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { label: "SUPP.", color: "bg-orange-100 text-orange-800 border-orange-300" },
];

const FREQ_OPTIONS = [
  { en: "BD", bn: "বিডি (দিনে ২ বার)" },
  { en: "TDS", bn: "টিডিএস (দিনে ৩ বার)" },
  { en: "QDS", bn: "কিউডিএস (দিনে ৪ বার)" },
  { en: "Once Daily", bn: "একবার দৈনিক" },
  { en: "12 Hourly", bn: "১২ ঘণ্টায় একবার" },
  { en: "8 Hourly", bn: "৮ ঘণ্টায় একবার" },
  { en: "6 Hourly", bn: "৬ ঘণ্টায় একবার" },
  { en: "Other", bn: "অন্যান্য" },
];

const DURATION_PRESETS = [
  { en: "3 days", bn: "৩ দিন" },
  { en: "5 days", bn: "৫ দিন" },
  { en: "7 days", bn: "৭ দিন" },
  { en: "10 days", bn: "১০ দিন" },
  { en: "14 days", bn: "১৪ দিন" },
  { en: "1 month", bn: "১ মাস" },
  { en: "Continue", bn: "চলতে থাকবে" },
];

const INSTRUCTION_PRESETS = [
  { en: "After meal", bn: "খাবারের পরে" },
  { en: "Before meal", bn: "খাবারের আগে" },
  { en: "Empty stomach", bn: "খালি পেটে" },
  { en: "At bedtime", bn: "ঘুমানোর আগে" },
  { en: "With water", bn: "পানি দিয়ে" },
  { en: "Chew & swallow", bn: "চিবিয়ে গিলতে হবে" },
  { en: "Dissolve in water", bn: "পানিতে মিশিয়ে খান" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

let _counter = 0;
function nextUid() {
  _counter += 1;
  return _counter;
}

function emptyMed(): MedEntry {
  return {
    _uid: nextUid(),
    drugType: "",
    nameType: "generic",
    name: "",
    dose: "",
    frequency: "",
    frequencyOther: "",
    durationEn: "",
    durationBn: "",
    instructionEn: "",
    instructionBn: "",
    fromDims: false,
  };
}

function dimsToMed(m: {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}): MedEntry {
  // Detect drug type prefix
  const name = m.name || "";
  let drugType: DrugType = "";
  let cleanName = name;
  for (const dt of ["TAB.", "SYP.", "INJ.", "INF.", "SUPP."] as DrugType[]) {
    if (name.toUpperCase().startsWith(dt)) {
      drugType = dt;
      cleanName = name.slice(dt.length).trim();
      break;
    }
  }
  // Map frequency
  const freqUpper = (m.frequency || "").toUpperCase();
  let freq = m.frequency || "";
  let freqOther = "";
  const known = FREQ_OPTIONS.map((f) => f.en.toUpperCase());
  if (!known.includes(freqUpper)) {
    freqOther = freq;
    freq = "Other";
  }
  return {
    _uid: nextUid(),
    drugType,
    nameType: "generic",
    name: cleanName,
    dose: m.dose || "",
    frequency: freq,
    frequencyOther: freqOther,
    durationEn: m.duration || "",
    durationBn:
      DURATION_PRESETS.find(
        (d) => d.en.toLowerCase() === (m.duration || "").toLowerCase(),
      )?.bn || "",
    instructionEn: m.instructions || "",
    instructionBn:
      INSTRUCTION_PRESETS.find(
        (p) => p.en.toLowerCase() === (m.instructions || "").toLowerCase(),
      )?.bn || "",
    fromDims: true,
    originalDims: undefined,
  };
}

function formatFreqDisplay(med: MedEntry): string {
  if (med.frequency === "Other") return med.frequencyOther || "";
  return med.frequency || "";
}

function formatDurationDisplay(med: MedEntry): string {
  const parts: string[] = [];
  if (med.durationEn) parts.push(med.durationEn);
  if (med.durationBn && med.durationBn !== med.durationEn)
    parts.push(`/ ${med.durationBn}`);
  return parts.join(" ");
}

function formatInstructionDisplay(med: MedEntry): string {
  const parts: string[] = [];
  if (med.instructionEn) parts.push(med.instructionEn);
  if (med.instructionBn && med.instructionBn !== med.instructionEn)
    parts.push(`/ ${med.instructionBn}`);
  return parts.join(" ");
}

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

// ─── RxPreviewPanel ────────────────────────────────────────────────────────

function RxPreviewPanel({
  diagnosis,
  medications,
  advice,
  prescriptionDate,
  patientName,
}: {
  diagnosis: string;
  medications: MedEntry[];
  advice: string;
  prescriptionDate: string;
  patientName?: string;
}) {
  const dateStr = prescriptionDate
    ? new Date(prescriptionDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const validMeds = medications.filter((m) => m.name.trim());

  return (
    <div className="h-full flex flex-col">
      {/* Panel header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <span className="font-bold text-base tracking-wide">
            ℞ Prescription Preview
          </span>
          <span className="text-xs text-teal-100">{dateStr}</span>
        </div>
        {patientName && (
          <p className="text-xs text-teal-100 mt-0.5">{patientName}</p>
        )}
      </div>

      {/* Diagnosis strip */}
      {diagnosis && (
        <div className="bg-teal-50 border-b border-teal-200 px-4 py-2">
          <span className="text-[10px] uppercase tracking-wider text-teal-600 font-semibold">
            Diagnosis / রোগ নির্ণয়
          </span>
          <p className="text-sm font-semibold text-teal-900 mt-0.5">
            {diagnosis}
          </p>
        </div>
      )}

      {/* Rx content */}
      <ScrollArea className="flex-1 bg-white">
        <div className="p-4">
          {/* Rx symbol */}
          <div className="text-4xl font-serif italic text-teal-700 mb-3 leading-none">
            ℞
          </div>

          {validMeds.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Add medications to see preview</p>
              <p className="text-xs mt-1">ওষুধ যোগ করুন</p>
            </div>
          ) : (
            <div className="space-y-4">
              {validMeds.map((med, idx) => (
                <div
                  key={med._uid}
                  className="flex gap-3 pb-3 border-b border-dashed border-gray-200 last:border-0"
                >
                  <span className="text-sm font-bold text-teal-700 min-w-[20px]">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 space-y-0.5">
                    {/* Drug name line */}
                    <div className="flex flex-wrap items-baseline gap-1">
                      {med.drugType && (
                        <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                          {med.drugType}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-900">
                        {med.name}
                      </span>
                      {med.nameType === "brand" && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                          Brand
                        </span>
                      )}
                      {med.dose && (
                        <span className="text-sm text-gray-700">
                          &mdash; {med.dose}
                        </span>
                      )}
                    </div>
                    {/* Frequency */}
                    {formatFreqDisplay(med) && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Freq:</span>{" "}
                        {formatFreqDisplay(med)}
                        {med.frequency !== "Other" &&
                          FREQ_OPTIONS.find((f) => f.en === med.frequency)
                            ?.bn && (
                            <span className="text-teal-600 ml-1">
                              (
                              {
                                FREQ_OPTIONS.find((f) => f.en === med.frequency)
                                  ?.bn
                              }
                              )
                            </span>
                          )}
                      </p>
                    )}
                    {/* Duration */}
                    {formatDurationDisplay(med) && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Duration:</span>{" "}
                        {formatDurationDisplay(med)}
                      </p>
                    )}
                    {/* Instruction */}
                    {formatInstructionDisplay(med) && (
                      <p className="text-xs italic text-teal-700">
                        {formatInstructionDisplay(med)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Advice */}
          {advice && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">
                Special Advice / বিশেষ পরামর্শ
              </p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">
                {advice}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── MedicationCard ────────────────────────────────────────────────────────

function MedicationCard({
  med,
  index,
  total,
  onChange,
  onRemove,
}: {
  med: MedEntry;
  index: number;
  total: number;
  onChange: (field: keyof MedEntry, value: string) => void;
  onRemove: () => void;
}) {
  const activeTypeStyle = (dt: string) =>
    med.drugType === dt
      ? "ring-2 ring-offset-1 ring-teal-500 font-bold scale-105"
      : "opacity-70 hover:opacity-100";

  const activeFreqStyle = (fr: string) =>
    med.frequency === fr
      ? "bg-teal-600 text-white border-teal-600"
      : "hover:bg-teal-50";

  return (
    <div className="border-2 border-teal-100 rounded-xl p-4 space-y-3 bg-white shadow-sm relative">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
          {index + 1}
        </span>
        {med.fromDims && (
          <Badge
            variant="outline"
            className="text-[10px] h-5 border-teal-300 text-teal-700 bg-teal-50"
          >
            DIMS
          </Badge>
        )}
        {total > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Drug type */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">Drug Type / ওষুধের ধরন</Label>
        <div className="flex flex-wrap gap-1.5">
          {DRUG_TYPES.map(({ label, color }) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                onChange("drugType", med.drugType === label ? "" : label)
              }
              className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-all ${color} ${activeTypeStyle(label)}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Generic / Brand toggle + Name */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-gray-500">Name / নাম</Label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => onChange("nameType", "generic")}
              className={`px-2.5 py-1 transition-colors ${
                med.nameType === "generic"
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Generic
            </button>
            <button
              type="button"
              onClick={() => onChange("nameType", "brand")}
              className={`px-2.5 py-1 border-l transition-colors ${
                med.nameType === "brand"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Brand
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={med.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder={
              med.nameType === "generic" ? "Generic drug name" : "Brand name"
            }
            className="flex-1 h-9 text-sm"
          />
          <a
            href={`https://medex.com.bd/brands?search=${encodeURIComponent(med.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
            title="Search on Medex"
          >
            <ExternalLink className="w-3 h-3" />
            Medex
          </a>
        </div>
      </div>

      {/* Dose */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">Dose / মাত্রা</Label>
        <Input
          value={med.dose}
          onChange={(e) => onChange("dose", e.target.value)}
          placeholder="e.g. 500mg, 1 tab, 5ml"
          className="h-9 text-sm"
        />
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">Frequency / বার</Label>
        <div className="flex flex-wrap gap-1.5">
          {FREQ_OPTIONS.map(({ en, bn }) => (
            <button
              key={en}
              type="button"
              onClick={() =>
                onChange("frequency", med.frequency === en ? "" : en)
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${activeFreqStyle(en)}`}
            >
              <span className="font-bold">{en}</span>
              <span className="block text-[10px] opacity-70">{bn}</span>
            </button>
          ))}
        </div>
        {med.frequency === "Other" && (
          <Input
            value={med.frequencyOther}
            onChange={(e) => onChange("frequencyOther", e.target.value)}
            placeholder="Specify frequency / বার উল্লেখ করুন"
            className="h-9 text-sm mt-1"
          />
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">
          Duration / সময়কাল (EN + বাংলা)
        </Label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {DURATION_PRESETS.map(({ en, bn }) => (
            <button
              key={en}
              type="button"
              onClick={() => {
                onChange("durationEn", med.durationEn === en ? "" : en);
                onChange("durationBn", med.durationBn === bn ? "" : bn);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                med.durationEn === en
                  ? "bg-teal-600 text-white border-teal-600"
                  : "hover:bg-teal-50"
              }`}
            >
              {en} / {bn}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={med.durationEn}
            onChange={(e) => onChange("durationEn", e.target.value)}
            placeholder="e.g. 7 days"
            className="h-9 text-sm"
          />
          <Input
            value={med.durationBn}
            onChange={(e) => onChange("durationBn", e.target.value)}
            placeholder="যেমন: ৭ দিন"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Instruction */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-500">
          Instruction / নির্দেশনা (Doctor chooses language)
        </Label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {INSTRUCTION_PRESETS.map(({ en, bn }) => (
            <button
              key={en}
              type="button"
              onClick={() => {
                // Toggle instruction - if both match, clear. Otherwise set.
                const bothMatch =
                  med.instructionEn === en && med.instructionBn === bn;
                if (bothMatch) {
                  onChange("instructionEn", "");
                  onChange("instructionBn", "");
                } else {
                  onChange("instructionEn", en);
                  onChange("instructionBn", bn);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                med.instructionEn === en || med.instructionBn === bn
                  ? "bg-amber-500 text-white border-amber-500"
                  : "hover:bg-amber-50"
              }`}
            >
              {en} / {bn}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={med.instructionEn}
            onChange={(e) => onChange("instructionEn", e.target.value)}
            placeholder="English instruction"
            className="h-9 text-sm"
          />
          <Input
            value={med.instructionBn}
            onChange={(e) => onChange("instructionBn", e.target.value)}
            placeholder="বাংলা নির্দেশনা"
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function NewPrescriptionMode({
  patientId,
  visitId,
  patientName,
  initialDiagnosis,
  onSubmit,
  onCancel,
  isLoading,
}: NewPrescriptionModeProps) {
  const initEntry = initialDiagnosis
    ? getDimsByDiagnosis(initialDiagnosis)
    : undefined;

  const [prescriptionDate, setPrescriptionDate] = useState(todayDateString());
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis ?? "");
  const [medications, setMedications] = useState<MedEntry[]>(
    initEntry ? initEntry.medications.map(dimsToMed) : [emptyMed()],
  );
  const [dimsAutoFilled, setDimsAutoFilled] = useState(!!initEntry);
  const [dimsNotes, setDimsNotes] = useState<string | undefined>(
    initEntry?.notes,
  );
  const [advice, setAdvice] = useState("");
  const [suggestions, setSuggestions] = useState<DimsEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const diagnosisRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        diagnosisRef.current &&
        !diagnosisRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleDiagnosisChange = (val: string) => {
    setDiagnosis(val);
    if (val.length >= 2) {
      const results = searchDims(val);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const applyDimsEntry = (entry: DimsEntry) => {
    setDiagnosis(entry.diagnosis);
    setMedications(entry.medications.map(dimsToMed));
    setDimsAutoFilled(true);
    setDimsNotes(entry.notes);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const resetToDims = () => {
    const entry = getDimsByDiagnosis(diagnosis);
    if (entry) {
      setMedications(entry.medications.map(dimsToMed));
      setDimsNotes(entry.notes);
    }
  };

  const addMed = () => setMedications((prev) => [...prev, emptyMed()]);

  const removeMed = (uid: number) =>
    setMedications((prev) => prev.filter((m) => m._uid !== uid));

  const updateMed = (uid: number, field: keyof MedEntry, value: string) =>
    setMedications((prev) =>
      prev.map((m) => (m._uid === uid ? { ...m, [field]: value } : m)),
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validMeds: Medication[] = medications
      .filter((m) => m.name.trim())
      .map((m) => {
        const prefix = m.drugType ? `${m.drugType} ` : "";
        const freq = m.frequency === "Other" ? m.frequencyOther : m.frequency;
        const dur = [m.durationEn, m.durationBn].filter(Boolean).join(" / ");
        const instr = [m.instructionEn, m.instructionBn]
          .filter(Boolean)
          .join(" / ");
        return {
          name: (prefix + m.name).trim(),
          dose: m.dose.trim(),
          frequency: freq.trim(),
          duration: dur.trim(),
          instructions: instr.trim(),
        };
      });
    const date = BigInt(new Date(prescriptionDate).getTime()) * 1000000n;
    onSubmit({
      patientId,
      visitId: visitId ?? null,
      prescriptionDate: date,
      diagnosis: diagnosis.trim() || null,
      medications: validMeds,
      notes: advice.trim() || null,
    });
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "80vh" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-teal-700 to-teal-600">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-base">
            New Prescription
          </span>
          {dimsAutoFilled && (
            <Badge className="bg-teal-100 text-teal-800 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              DIMS Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={prescriptionDate}
            onChange={(e) => setPrescriptionDate(e.target.value)}
            className="text-xs px-2 py-1 rounded border bg-white text-gray-700"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-white hover:bg-teal-800 h-7 px-3"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Input panel */}
        <div className="flex-1 overflow-y-auto bg-gray-50 border-r">
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Diagnosis */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">
                Diagnosis / রোগ নির্ণয়
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={diagnosisRef}
                  value={diagnosis}
                  onChange={(e) => handleDiagnosisChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Type diagnosis to search DIMS..."
                  className="pl-9 bg-white"
                  autoComplete="off"
                />
                {diagnosis && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiagnosis("");
                      setDimsAutoFilled(false);
                      setDimsNotes(undefined);
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden"
                  >
                    <ScrollArea className="max-h-48">
                      <div className="p-1">
                        {suggestions.map((entry) => (
                          <button
                            key={entry.diagnosis}
                            type="button"
                            onClick={() => applyDimsEntry(entry)}
                            className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {entry.diagnosis}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.category} &middot;{" "}
                                {entry.medications.length} medications
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs border-teal-300 text-teal-700 bg-teal-50"
                            >
                              DIMS
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              {dimsAutoFilled && (
                <div className="flex items-center gap-2 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-xs text-teal-700">
                    Auto-filled from DIMS
                  </span>
                  <button
                    type="button"
                    onClick={resetToDims}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 ml-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              )}
              {dimsNotes && (
                <Alert className="border-blue-200 bg-blue-50 py-2">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <AlertDescription className="text-xs text-blue-800">
                    <span className="font-semibold">Clinical note: </span>
                    {dimsNotes}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Medications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">
                  Medications / ওষুধ
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMed}
                  className="h-7 px-2 text-xs gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>
              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <MedicationCard
                    key={med._uid}
                    med={med}
                    index={idx}
                    total={medications.length}
                    onChange={(field, value) =>
                      updateMed(med._uid, field, value)
                    }
                    onRemove={() => removeMed(med._uid)}
                  />
                ))}
              </div>
            </div>

            {/* Advice */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-gray-700">
                Special Advice / বিশেষ পরামর্শ
              </Label>
              <Textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="Write special advice for the patient here... / রোগীর জন্য বিশেষ পরামর্শ লিখুন..."
                rows={3}
                className="text-sm bg-white resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 pb-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isLoading ? "Saving..." : "Save Prescription"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="px-4"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT: Rx preview */}
        <div className="w-96 flex-shrink-0 flex flex-col border-l overflow-hidden">
          <RxPreviewPanel
            diagnosis={diagnosis}
            medications={medications}
            advice={advice}
            prescriptionDate={prescriptionDate}
            patientName={patientName}
          />
        </div>
      </div>
    </div>
  );
}
