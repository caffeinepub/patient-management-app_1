import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Moon,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Medication } from "../backend.d";
import {
  type AdviceTemplate,
  deleteCustomTemplate,
  getAllTemplates,
  saveCustomTemplate,
} from "./AdviceTemplates";
import { getDimsByDiagnosis, searchDims } from "./DimsData";
import {
  type TreatmentDrug,
  type TreatmentTemplate,
  searchTreatmentTemplates,
} from "./TreatmentTemplates";

interface UpgradedPrescriptionEMRProps {
  patientId: bigint;
  visitId?: bigint;
  patientName?: string;
  patientAge?: number | null;
  patientGender?: string;
  patientWeight?: string;
  patientAddress?: string;
  patientBloodGroup?: string;
  registerNumber?: string;
  initialDiagnosis?: string;
  visitExtendedData?: Record<string, unknown>;
  patientRegisterNumber?: string;
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

interface RxDrug {
  id: string;
  drugForm: string;
  route: string;
  routeBn: string;
  drugName: string;
  brandName: string;
  nameType: "brand" | "generic";
  dose: string;
  duration: string;
  durationBn: string;
  instructions: string;
  instructionBn: string;
  frequency: string;
  frequencyBn: string;
  specialInstruction: string;
  specialInstructionBn: string;
}

const DRUG_FORMS = ["Tab.", "Cap.", "Syp.", "Inj.", "Inf.", "Supp.", ""];

const ROUTES_BN: Array<{ en: string; bn: string }> = [
  { en: "PO", bn: "মুখে" },
  { en: "IV", bn: "শিরায়" },
  { en: "IM", bn: "মাংসপেশিতে" },
  { en: "SC", bn: "চামড়ার নিচে" },
  { en: "Topical", bn: "স্থানীয়" },
  { en: "Rectal", bn: "মলদ্বারে" },
  { en: "SL", bn: "জিহ্বার নিচে" },
  { en: "Inhalation", bn: "শ্বাসের মাধ্যমে" },
];

const FREQUENCY_PRESETS: Array<{ en: string; bn: string }> = [
  { en: "Once daily", bn: "দিনে ১ বার" },
  { en: "BD 1+0+1", bn: "সকাল-রাত ১+০+১" },
  { en: "TDS 1+1+1", bn: "সকাল-দুপুর-রাত ১+১+১" },
  { en: "QDS 1+1+1+1", bn: "৬ ঘণ্টা পর পর" },
  { en: "8 hourly", bn: "৮ ঘণ্টা পর পর" },
  { en: "12 hourly", bn: "১২ ঘণ্টা পর পর" },
  { en: "At night", bn: "রাতে ঘুমানোর আগে" },
  { en: "SOS", bn: "প্রয়োজনে" },
];

const DURATION_PRESETS: Array<{ en: string; bn: string }> = [
  { en: "3 days", bn: "৩ দিন" },
  { en: "5 days", bn: "৫ দিন" },
  { en: "7 days", bn: "৭ দিন" },
  { en: "10 days", bn: "১০ দিন" },
  { en: "14 days", bn: "১৪ দিন" },
  { en: "1 month", bn: "১ মাস" },
  { en: "Continue", bn: "চলমান" },
];

const INSTRUCTION_PRESETS: Array<{ en: string; bn: string }> = [
  { en: "After meal", bn: "খাবার পরে" },
  { en: "Before meal", bn: "খাবার আগে" },
  { en: "Empty stomach", bn: "খালি পেটে" },
  { en: "With water", bn: "পানির সাথে" },
  { en: "With milk", bn: "দুধের সাথে" },
];

const ADVICE_CATEGORIES = [
  "সব",
  "বিশ্রাম",
  "ওষুধ",
  "খাদ্য ও পানীয়",
  "জীবনযাত্রা",
  "ফলো-আপ",
  "সতর্কতা",
  "Custom",
];

function drugFromTreatmentDrug(td: TreatmentDrug): RxDrug {
  return {
    id: Math.random().toString(36).slice(2),
    drugForm: "Tab.",
    route: td.route,
    routeBn: ROUTES_BN.find((r) => r.en === td.route)?.bn || "মুখে",
    drugName: td.name,
    brandName: "",
    nameType: td.nameType,
    dose: td.dose,
    duration: td.duration,
    durationBn: "",
    instructions: td.instructions,
    instructionBn: "",
    frequency: "",
    frequencyBn: "",
    specialInstruction: "",
    specialInstructionBn: "",
  };
}

// ─── Visit data helpers ────────────────────────────────────────────────────────

function populateFromVisitData(vd: Record<string, unknown>) {
  // C/C
  const ccLines: string[] = [];
  const chiefComplaints = vd.chiefComplaints as string[] | undefined;
  const complaintAnswers = vd.complaintAnswers as
    | Record<string, string | string[]>
    | undefined;
  if (chiefComplaints) {
    chiefComplaints.forEach((complaint, i) => {
      const rawAnswers = complaintAnswers?.[complaint];
      let answers: string[] = [];
      if (Array.isArray(rawAnswers)) {
        answers = rawAnswers.filter(Boolean);
      } else if (typeof rawAnswers === "string" && rawAnswers) {
        answers = [rawAnswers];
      } else if (rawAnswers && typeof rawAnswers === "object") {
        answers = Object.values(rawAnswers as Record<string, string>).filter(
          Boolean,
        );
      }
      if (answers.length > 0) {
        ccLines.push(
          `${i + 1}. ${complaint} — ${answers.slice(0, 3).join(", ")}`,
        );
      } else {
        ccLines.push(`${i + 1}. ${complaint}`);
      }
    });
  }
  // Positive system review
  const sra = vd.systemReviewAnswers as Record<string, string> | undefined;
  if (sra) {
    const positive = Object.entries(sra)
      .filter(([, v]) => v && v !== "Normal" && v !== "None" && v !== "No")
      .map(([k, v]) => `${k}: ${v}`);
    if (positive.length > 0) {
      ccLines.push(`Positive system review: ${positive.join("; ")}`);
    }
  }

  // P/M/H
  const pmhLines: string[] = [];
  const pmhAll = vd.pastMedicalHistoryAll as Record<string, string> | undefined;
  const pmh = vd.pastMedicalHistory as string[] | string | undefined;
  const surgical = vd.surgicalHistory as string[] | undefined;
  const pastSurgical = vd.pastSurgicalHistory as string | undefined;
  if (pmhAll) {
    const pos = Object.entries(pmhAll)
      .map(([k, v]) => `${k}${v === "+" ? "+" : v === "-" ? "-" : ""}`)
      .join(", ");
    if (pos) pmhLines.push(pos);
  } else if (Array.isArray(pmh) && pmh.length > 0) {
    pmhLines.push(`${pmh.join(", ")}`);
  } else if (typeof pmh === "string" && pmh) {
    pmhLines.push(pmh);
  }
  if (surgical && surgical.length > 0) {
    pmhLines.push(`Surgical: ${surgical.join(", ")}`);
  } else if (pastSurgical) {
    pmhLines.push(`Surgical: ${pastSurgical}`);
  }

  // History tabs
  const histPersonal =
    (vd.historyPersonal as string) ||
    ((vd.personalHistory as string[])?.filter(Boolean).join(", ") ?? "");
  const histFamily =
    (vd.historyFamily as string) ||
    ((vd.familyHistory as string[])?.filter(Boolean).join(", ") ?? "");
  const histImmunization =
    (vd.historyImmunization as string) ||
    ((vd.immunizationHistory as string[])?.filter(Boolean).join(", ") ?? "");
  const histAllergy =
    (vd.historyAllergy as string) ||
    ((vd.allergyHistory as string[])?.filter(Boolean).join(", ") ?? "");
  const histObstetric =
    (vd.historyObstetric as string) ||
    ((vd.obstetricHistory as string[])?.filter(Boolean).join(", ") ?? "");
  const histGynae = (vd.historyGynaecological as string) || "";
  let histOthers = "";
  if (histObstetric) histOthers += `Obstetric: ${histObstetric}\n`;
  if (histGynae) histOthers += `Gynaecological: ${histGynae}\n`;

  // D/H
  const dhDrugs = vd.drugHistory as
    | Array<{
        name: string;
        dose?: string;
        frequency?: string;
        duration?: string;
        type?: string;
      }>
    | undefined;
  const dhParts: string[] = [];
  if (dhDrugs && dhDrugs.length > 0) {
    for (const d of dhDrugs) {
      if (d.name) {
        const form = d.type || "Tab.";
        const parts = [form, d.name, d.dose, d.frequency]
          .filter(Boolean)
          .join(" ");
        dhParts.push(parts.trim());
      }
    }
  }

  // O/E
  const oeLines: string[] = [];
  const vs = vd.vitalSigns as
    | {
        bloodPressure?: string;
        pulse?: string;
        temperature?: string;
        oxygenSaturation?: string;
        respiratoryRate?: string;
      }
    | undefined;
  if (vs) {
    const vsParts: string[] = [];
    if (vs.bloodPressure) vsParts.push(`BP: ${vs.bloodPressure}`);
    if (vs.pulse) vsParts.push(`Pulse: ${vs.pulse}/min`);
    if (vs.temperature) vsParts.push(`Temp: ${vs.temperature}°F`);
    if (vs.oxygenSaturation) vsParts.push(`SpO2: ${vs.oxygenSaturation}%`);
    if (vs.respiratoryRate) vsParts.push(`RR: ${vs.respiratoryRate}/min`);
    if (vsParts.length > 0) oeLines.push(vsParts.join(", "));
  }
  const genExam = vd.generalExamFindings as Record<string, string> | undefined;
  if (genExam) {
    const pos = Object.entries(genExam)
      .filter(
        ([, v]) =>
          v && v !== "Normal" && v !== "None" && v !== "No" && v !== "Absent",
      )
      .map(([k, v]) => `${k}: ${v}`);
    if (pos.length > 0) oeLines.push(`General: ${pos.join("; ")}`);
  }
  const sysExam = vd.systemicExamFindings as Record<string, string> | undefined;
  if (sysExam) {
    const pos = Object.entries(sysExam)
      .filter(([, v]) => v && v !== "Normal" && v !== "None")
      .map(([k, v]) => `${k}: ${v}`);
    if (pos.length > 0) oeLines.push(`Systemic: ${pos.join("; ")}`);
  }
  // fallback
  if (oeLines.length === 0) {
    oeLines.push("Heart: S1+S2+0, Lung: Clear, P/A: NAD");
  }

  // Investigation — group by date, sort newest first
  const invRows = vd.previous_investigation_rows as
    | Array<{
        date: string;
        name: string;
        result: string;
        unit?: string;
        interpretation?: string;
      }>
    | undefined;
  let invText = "";
  if (invRows && invRows.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const r of invRows) {
      if (!r.name || !r.result) continue;
      const d = r.date || "Unknown";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(`${r.name} - ${r.result}${r.unit ? r.unit : ""}`);
    }
    const sorted = Object.entries(grouped).sort(([a], [b]) =>
      b.localeCompare(a),
    );
    invText = sorted
      .map(([date, items]) => `${date}: ${items.join(", ")}`)
      .join("\n");
  }

  return {
    cc: ccLines.join("\n"),
    pmh: pmhLines.join("\n"),
    histPersonal,
    histFamily,
    histImmunization,
    histAllergy,
    histOthers: histOthers.trim(),
    dh: dhParts.join(", "),
    oe: oeLines.join("\n"),
    investigation: invText,
    adviceNewInv: (vd.investigationAdvice as string) || "",
  };
}

export default function UpgradedPrescriptionEMR(
  props: UpgradedPrescriptionEMRProps,
) {
  const {
    patientId,
    visitId,
    patientName,
    patientAge,
    patientGender,
    patientWeight,
    patientAddress,
    patientBloodGroup,
    registerNumber,
    initialDiagnosis,
    visitExtendedData,
    patientRegisterNumber,
    onSubmit,
    onCancel,
    isLoading,
  } = props;

  const DRAFT_KEY = `medicare_rx_draft_${patientId}`;

  const [dark, setDark] = useState(false);
  const [withHeader, setWithHeader] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Patient info
  const [name, setName] = useState(patientName ?? "");
  const [age, setAge] = useState(patientAge != null ? String(patientAge) : "");
  const [sex, setSex] = useState(patientGender ?? "");
  const [weight, setWeight] = useState(patientWeight ?? "");
  const [rxDate, setRxDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [regNo, setRegNo] = useState(
    patientRegisterNumber ?? registerNumber ?? "",
  );
  const [address, setAddress] = useState(patientAddress ?? "");
  const [bloodGroup, setBloodGroup] = useState(patientBloodGroup ?? "");

  // Left panel
  const [cc, setCc] = useState("");
  const [pmh, setPmh] = useState("");
  const [historyPersonal, setHistoryPersonal] = useState("");
  const [historyFamily, setHistoryFamily] = useState("");
  const [historyImmunization, setHistoryImmunization] = useState("");
  const [historyAllergy, setHistoryAllergy] = useState("");
  const [historyOthers, setHistoryOthers] = useState("");
  const [dh, setDh] = useState("");
  const [oe, setOe] = useState("");
  const [investigation, setInvestigation] = useState("");
  const [adviceNewInv, setAdviceNewInv] = useState("");

  // Center panel
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis ?? "");
  const [diagnosisQuery, setDiagnosisQuery] = useState("");
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<
    Array<{ label: string; type: "DIMS" | "Template"; item: unknown }>
  >([]);
  const [showDiagnosisDrop, setShowDiagnosisDrop] = useState(false);
  const [dimsActive, setDimsActive] = useState(false);

  const [rxDrugs, setRxDrugs] = useState<RxDrug[]>([]);
  const [editingDrugId, setEditingDrugId] = useState<string | null>(null);

  // Drug input form
  const [drugForm, setDrugForm] = useState("Tab.");
  const [drugRoute, setDrugRoute] = useState("PO");
  const [drugName, setDrugName] = useState("");
  const [drugBrandName, setDrugBrandName] = useState("");
  const [drugNameType] = useState<"brand" | "generic">("generic");
  const [drugDose, setDrugDose] = useState("");
  const [drugDuration, setDrugDuration] = useState("");
  const [drugDurationBn, setDrugDurationBn] = useState("");
  const [drugInstructions, setDrugInstructions] = useState("");
  const [drugInstructionBn, setDrugInstructionBn] = useState("");
  const [drugFrequency, setDrugFrequency] = useState("");
  const [drugFrequencyBn, setDrugFrequencyBn] = useState("");
  const [drugSpecialInstruction, setDrugSpecialInstruction] = useState("");
  const [drugSpecialInstructionBn, setDrugSpecialInstructionBn] = useState("");

  // Treatment template
  const [treatmentQuery, setTreatmentQuery] = useState("");
  const [treatmentResults, setTreatmentResults] = useState<TreatmentTemplate[]>(
    [],
  );
  const [showTreatmentSection, setShowTreatmentSection] = useState(false);

  // Advice
  const [adviceText, setAdviceText] = useState("");
  const [adviceQuery, setAdviceQuery] = useState("");
  const [adviceCategory, setAdviceCategory] = useState("সব");
  const [allTemplates, setAllTemplates] = useState<AdviceTemplate[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customCategory, setCustomCategory] = useState("Custom");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function applyVisitData(vd: Record<string, unknown>) {
    const pop = populateFromVisitData(vd);
    if (pop.cc) setCc(pop.cc);
    if (pop.pmh) setPmh(pop.pmh);
    if (pop.histPersonal) setHistoryPersonal(pop.histPersonal);
    if (pop.histFamily) setHistoryFamily(pop.histFamily);
    if (pop.histImmunization) setHistoryImmunization(pop.histImmunization);
    if (pop.histAllergy) setHistoryAllergy(pop.histAllergy);
    if (pop.histOthers) setHistoryOthers(pop.histOthers);
    if (pop.dh) setDh(pop.dh);
    if (pop.oe) setOe(pop.oe);
    if (pop.investigation) setInvestigation(pop.investigation);
    if (pop.adviceNewInv) setAdviceNewInv(pop.adviceNewInv);
  }

  // Load draft or visit data
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.cc) setCc(d.cc);
        if (d.pmh) setPmh(d.pmh);
        if (d.dh) setDh(d.dh);
        if (d.oe) setOe(d.oe);
        if (d.investigation) setInvestigation(d.investigation);
        if (d.adviceNewInv) setAdviceNewInv(d.adviceNewInv);
        if (d.adviceText) setAdviceText(d.adviceText);
        if (d.diagnosis) setDiagnosis(d.diagnosis);
        if (d.rxDrugs) setRxDrugs(d.rxDrugs);
      } else if (visitExtendedData) {
        applyVisitData(visitExtendedData);
      }
    } catch {
      /* ignore */
    }
    setAllTemplates(getAllTemplates());
  }, [DRAFT_KEY]);

  // Auto-save draft
  const saveDraft = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          cc,
          pmh,
          dh,
          oe,
          investigation,
          adviceNewInv,
          adviceText,
          diagnosis,
          rxDrugs,
        }),
      );
    }, 800);
  }, [
    DRAFT_KEY,
    cc,
    pmh,
    dh,
    oe,
    investigation,
    adviceNewInv,
    adviceText,
    diagnosis,
    rxDrugs,
  ]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // Diagnosis search
  useEffect(() => {
    if (diagnosisQuery.length < 2) {
      setDiagnosisSuggestions([]);
      setShowDiagnosisDrop(false);
      return;
    }
    const dimsResults = searchDims(diagnosisQuery).map((e) => ({
      label: e.diagnosis,
      type: "DIMS" as const,
      item: e,
    }));
    const tplResults = searchTreatmentTemplates(diagnosisQuery).map((t) => ({
      label: t.diagnosis,
      type: "Template" as const,
      item: t,
    }));
    setDiagnosisSuggestions([...dimsResults, ...tplResults].slice(0, 10));
    setShowDiagnosisDrop(true);
  }, [diagnosisQuery]);

  // Treatment search
  useEffect(() => {
    if (treatmentQuery.length < 2) {
      setTreatmentResults([]);
      return;
    }
    setTreatmentResults(searchTreatmentTemplates(treatmentQuery));
  }, [treatmentQuery]);

  function applyDiagnosisSuggestion(s: {
    label: string;
    type: "DIMS" | "Template";
    item: unknown;
  }) {
    setDiagnosis(s.label);
    setDiagnosisQuery("");
    setShowDiagnosisDrop(false);
    if (s.type === "DIMS") {
      const entry = getDimsByDiagnosis(s.label);
      if (entry) {
        const drugs: RxDrug[] = entry.medications.map((m) => ({
          id: Math.random().toString(36).slice(2),
          drugForm: "Tab.",
          route: "PO",
          routeBn: "মুখে",
          drugName: m.name,
          brandName: "",
          nameType: "generic" as const,
          dose: m.dose,
          duration: m.duration,
          durationBn: "",
          instructions: m.instructions,
          instructionBn: "",
          frequency: m.frequency,
          frequencyBn: "",
          specialInstruction: "",
          specialInstructionBn: "",
        }));
        setRxDrugs(drugs);
        setDimsActive(true);
      }
    } else {
      const tpl = s.item as TreatmentTemplate;
      setDiagnosis(tpl.diagnosis);
      setRxDrugs(tpl.drugs.map(drugFromTreatmentDrug));
      if (tpl.advice) setAdviceText(tpl.advice.join("\n"));
      setDimsActive(false);
    }
  }

  function applyTreatmentTemplate(tpl: TreatmentTemplate) {
    setDiagnosis(tpl.diagnosis);
    setRxDrugs(tpl.drugs.map(drugFromTreatmentDrug));
    if (tpl.advice) setAdviceText(tpl.advice.join("\n"));
    setTreatmentQuery("");
    setTreatmentResults([]);
    setDimsActive(false);
  }

  function addDrug() {
    if (!drugName.trim()) return;
    const newDrug: RxDrug = {
      id: Math.random().toString(36).slice(2),
      drugForm,
      route: drugRoute,
      routeBn: ROUTES_BN.find((r) => r.en === drugRoute)?.bn || "মুখে",
      drugName: drugName.trim(),
      brandName: drugBrandName.trim(),
      nameType: drugNameType,
      dose: drugDose,
      duration: drugDuration,
      durationBn: drugDurationBn,
      instructions: drugInstructions,
      instructionBn: drugInstructionBn,
      frequency: drugFrequency,
      frequencyBn: drugFrequencyBn,
      specialInstruction: drugSpecialInstruction,
      specialInstructionBn: drugSpecialInstructionBn,
    };
    setRxDrugs((prev) => [...prev, newDrug]);
    setDrugName("");
    setDrugBrandName("");
    setDrugDose("");
    setDrugDuration("");
    setDrugDurationBn("");
    setDrugInstructions("");
    setDrugInstructionBn("");
    setDrugFrequency("");
    setDrugFrequencyBn("");
    setDrugSpecialInstruction("");
    setDrugSpecialInstructionBn("");
  }

  function deleteDrug(id: string) {
    setRxDrugs((prev) => prev.filter((d) => d.id !== id));
  }

  function updateDrug(id: string, field: keyof RxDrug, value: string) {
    setRxDrugs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  }

  function appendAdvice(text: string) {
    setAdviceText((prev) => (prev ? `${prev}\n${text}` : text));
  }

  function addCustomTemplate() {
    if (!customText.trim()) return;
    const tpl: AdviceTemplate = {
      id: `custom_${Date.now()}`,
      text: customText.trim(),
      category: customCategory,
      isCustom: true,
    };
    saveCustomTemplate(tpl);
    setAllTemplates(getAllTemplates());
    setCustomText("");
    setShowCustomForm(false);
  }

  function removeCustomTemplate(id: string) {
    deleteCustomTemplate(id);
    setAllTemplates(getAllTemplates());
  }

  const filteredTemplates = allTemplates.filter((t) => {
    const matchCat =
      adviceCategory === "সব"
        ? true
        : adviceCategory === "Custom"
          ? t.isCustom
          : t.category === adviceCategory;
    const matchQ =
      adviceQuery.length < 1
        ? true
        : t.text.toLowerCase().includes(adviceQuery.toLowerCase());
    return matchCat && matchQ;
  });

  function handleSave() {
    const medications: Medication[] = rxDrugs.map((d) => ({
      name: `${d.drugForm ? `${d.drugForm} ` : ""}${d.drugName}${d.brandName ? ` (${d.brandName})` : ""}`,
      dose: d.dose,
      frequency: d.frequencyBn || d.frequency || d.durationBn || d.duration,
      duration: d.durationBn || d.duration,
      instructions:
        d.instructionBn ||
        d.instructions ||
        d.specialInstructionBn ||
        d.specialInstruction,
    }));
    onSubmit({
      patientId,
      visitId: visitId ?? null,
      prescriptionDate: BigInt(Date.now()) * BigInt(1_000_000),
      diagnosis: diagnosis || null,
      medications,
      notes: adviceText || null,
    });
    localStorage.removeItem(DRAFT_KEY);
  }

  function getDoctorInfo() {
    try {
      const data = localStorage.getItem("medicare_doctors_data");
      if (data) {
        const parsed = JSON.parse(data);
        const doc = parsed.drArman || parsed[0] || null;
        if (doc) return doc;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
  const doctorInfo = getDoctorInfo();

  const inp = `w-full border rounded px-2 py-1 text-xs ${dark ? "bg-gray-800 border-gray-600 text-white" : "bg-white border-gray-300"}`;
  const rootClass = `fixed inset-0 z-50 flex flex-col overflow-hidden ${
    dark ? "dark bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
  }`;

  return (
    <div className={rootClass}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-3 py-2 bg-teal-700 text-white shadow z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">Prescription &amp; EMR</span>
          <Separator orientation="vertical" className="h-5 bg-teal-500" />
          <button
            type="button"
            onClick={() => setWithHeader(true)}
            className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
              withHeader
                ? "bg-white text-teal-800 border-white"
                : "border-teal-400 text-teal-100 hover:bg-teal-600"
            }`}
            data-ocid="rx.with_header.toggle"
          >
            With Header
          </button>
          <button
            type="button"
            onClick={() => setWithHeader(false)}
            className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
              !withHeader
                ? "bg-white text-teal-800 border-white"
                : "border-teal-400 text-teal-100 hover:bg-teal-600"
            }`}
            data-ocid="rx.without_header.toggle"
          >
            Without Header
          </button>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="p-1 rounded hover:bg-teal-600 transition-colors"
            data-ocid="rx.dark_mode.toggle"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onCancel}
            className="h-7 text-xs"
            data-ocid="rx.cancel.button"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="h-7 text-xs bg-white text-teal-800 hover:bg-teal-50"
            data-ocid="rx.save.button"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isLoading ? "Saving..." : "Save Prescription"}
          </Button>
        </div>
      </div>

      {/* PATIENT INFO PANEL */}
      <div
        className={`flex-shrink-0 border-b px-3 py-2 ${
          dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            {
              label: "Name",
              value: name,
              set: setName,
              id: "rx.name.input",
            },
          ].map((f) => (
            <div key={f.label} className="col-span-2">
              <span className="text-muted-foreground text-[10px] block mb-0.5">
                {f.label}
              </span>
              <input
                className={inp}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                data-ocid={f.id}
              />
            </div>
          ))}
          <div>
            <span className="text-muted-foreground text-[10px] block mb-0.5">
              Age
            </span>
            <input
              className={inp}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              data-ocid="rx.age.input"
            />
          </div>
          <div>
            <span className="text-muted-foreground text-[10px] block mb-0.5">
              Sex
            </span>
            <select
              className={`${inp}`}
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              data-ocid="rx.sex.select"
            >
              <option value="">--</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          {[
            {
              label: "Weight",
              value: weight,
              set: setWeight,
              id: "rx.weight.input",
            },
            {
              label: "Date",
              value: rxDate,
              set: setRxDate,
              id: "rx.date.input",
            },
            {
              label: "Reg No",
              value: regNo,
              set: setRegNo,
              id: "rx.reg_no.input",
            },
            {
              label: "Address",
              value: address,
              set: setAddress,
              id: "rx.address.input",
            },
          ].map((f) => (
            <div key={f.label}>
              <span className="text-muted-foreground text-[10px] block mb-0.5">
                {f.label}
              </span>
              <input
                className={inp}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                data-ocid={f.id}
              />
            </div>
          ))}
          <div>
            <span className="text-muted-foreground text-[10px] block mb-0.5">
              Blood Group
            </span>
            <select
              className={inp}
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              data-ocid="rx.blood_group.select"
            >
              <option value="">--</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — Clinical Summary */}
        <ScrollArea
          className={`w-[30%] border-r flex-shrink-0 ${
            dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <div className="p-2 space-y-2">
            {/* Header + Load button */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                Clinical Summary
              </h3>
              {visitExtendedData && (
                <button
                  type="button"
                  onClick={() => applyVisitData(visitExtendedData)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-teal-100 text-teal-700 border border-teal-300 rounded hover:bg-teal-200 transition-colors"
                  data-ocid="rx.load_from_visit.button"
                >
                  <RefreshCw className="w-3 h-3" />
                  Load from Visit
                </button>
              )}
            </div>

            {/* C/C */}
            <div className="rounded-lg border-l-4 border-l-blue-400 border border-blue-200 bg-blue-50 p-2">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide block mb-1">
                C/C — Chief Complaints
              </span>
              <Textarea
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                rows={4}
                className="text-xs resize-y bg-white border-blue-200 focus:ring-blue-300"
                placeholder="1. Cough — dry, 5 days&#10;2. Fever — high grade"
                data-ocid="rx.cc.textarea"
              />
            </div>

            {/* P/M/H */}
            <div className="rounded-lg border-l-4 border-l-green-500 border border-green-200 bg-green-50 p-2">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide block mb-1">
                P/M/H — Past Medical &amp; Surgical History
              </span>
              <Textarea
                value={pmh}
                onChange={(e) => setPmh(e.target.value)}
                rows={3}
                className="text-xs resize-y bg-white border-green-200"
                placeholder="DM+, HTN-&#10;Surgical: Appendectomy 2020"
                data-ocid="rx.pmh.textarea"
              />
            </div>

            {/* History */}
            <div className="rounded-lg border-l-4 border-l-purple-500 border border-purple-200 bg-purple-50 p-2">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide block mb-1">
                History
              </span>
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full h-7 text-[10px] bg-purple-100">
                  {[
                    ["personal", "Personal"],
                    ["family", "Family"],
                    ["immun", "Immun."],
                    ["allergy", "Allergy"],
                    ["others", "Others"],
                  ].map(([val, lbl]) => (
                    <TabsTrigger
                      key={val}
                      value={val}
                      className="text-[9px] px-1 flex-1"
                    >
                      {lbl}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="personal">
                  <Textarea
                    value={historyPersonal}
                    onChange={(e) => setHistoryPersonal(e.target.value)}
                    rows={3}
                    className="text-xs bg-white border-purple-200"
                    data-ocid="rx.history_personal.textarea"
                  />
                </TabsContent>
                <TabsContent value="family">
                  <Textarea
                    value={historyFamily}
                    onChange={(e) => setHistoryFamily(e.target.value)}
                    rows={3}
                    className="text-xs bg-white border-purple-200"
                    data-ocid="rx.history_family.textarea"
                  />
                </TabsContent>
                <TabsContent value="immun">
                  <Textarea
                    value={historyImmunization}
                    onChange={(e) => setHistoryImmunization(e.target.value)}
                    rows={3}
                    className="text-xs bg-white border-purple-200"
                    data-ocid="rx.history_immunization.textarea"
                  />
                </TabsContent>
                <TabsContent value="allergy">
                  <Textarea
                    value={historyAllergy}
                    onChange={(e) => setHistoryAllergy(e.target.value)}
                    rows={3}
                    className="text-xs bg-white border-purple-200"
                    data-ocid="rx.history_allergy.textarea"
                  />
                </TabsContent>
                <TabsContent value="others">
                  <Textarea
                    value={historyOthers}
                    onChange={(e) => setHistoryOthers(e.target.value)}
                    rows={3}
                    className="text-xs bg-white border-purple-200"
                    data-ocid="rx.history_others.textarea"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* D/H */}
            <div className="rounded-lg border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50 p-2">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block mb-1">
                D/H — Drug History
              </span>
              <Textarea
                value={dh}
                onChange={(e) => setDh(e.target.value)}
                rows={3}
                className="text-xs resize-y bg-white border-amber-200"
                placeholder="Tab. Napa 500mg 1+1+1, Tab. Fexo 120mg once daily"
                data-ocid="rx.dh.textarea"
              />
            </div>

            {/* O/E */}
            <div className="rounded-lg border-l-4 border-l-rose-500 border border-rose-200 bg-rose-50 p-2">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide block mb-1">
                O/E — On Examination
              </span>
              <Textarea
                value={oe}
                onChange={(e) => setOe(e.target.value)}
                rows={4}
                className="text-xs resize-y bg-white border-rose-200"
                placeholder="BP: 120/80, Pulse: 82/min&#10;Heart: S1+S2+0, Lung: Clear"
                data-ocid="rx.oe.textarea"
              />
            </div>

            {/* Investigation */}
            <div className="rounded-lg border-l-4 border-l-teal-500 border border-teal-200 bg-teal-50 p-2">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide block mb-1">
                Investigation Report
              </span>
              <Textarea
                value={investigation}
                onChange={(e) => setInvestigation(e.target.value)}
                rows={4}
                className="text-xs resize-y bg-white border-teal-200"
                placeholder="13/03/2026: Hb% - 12.3g/dl, S.Creatinine - 1.12&#10;12/03/2026: Blood Glucose - 6.5mmol/L"
                data-ocid="rx.investigation.textarea"
              />
            </div>

            {/* Advice/New Investigation */}
            <div className="rounded-lg border-l-4 border-l-orange-500 border border-orange-200 bg-orange-50 p-2">
              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide block mb-1">
                Advice / New Investigation
              </span>
              <Textarea
                value={adviceNewInv}
                onChange={(e) => setAdviceNewInv(e.target.value)}
                rows={3}
                className="text-xs resize-y bg-white border-orange-200"
                placeholder="CBC, RBS, ECG..."
                data-ocid="rx.advice_new_inv.textarea"
              />
            </div>
          </div>
        </ScrollArea>

        {/* CENTER PANEL */}
        <ScrollArea className={`flex-1 ${dark ? "bg-gray-950" : "bg-gray-50"}`}>
          <div className="p-3 space-y-4">
            {/* DIAGNOSIS */}
            <div
              className={`rounded-lg p-3 ${
                dark ? "bg-gray-900" : "bg-white"
              } shadow-sm`}
            >
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide block mb-2">
                Diagnosis
              </span>
              <div className="relative">
                <input
                  className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${
                    dark
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  }`}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Type or search diagnosis..."
                  data-ocid="rx.diagnosis.input"
                />
                <div className="absolute right-0 top-0 flex">
                  <input
                    className={`border rounded-l px-2 py-1 text-xs border-r-0 w-32 ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    value={diagnosisQuery}
                    onChange={(e) => setDiagnosisQuery(e.target.value)}
                    onFocus={() =>
                      diagnosisQuery.length >= 2 && setShowDiagnosisDrop(true)
                    }
                    placeholder="Search..."
                    data-ocid="rx.diagnosis_search.input"
                  />
                  <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
              {showDiagnosisDrop && diagnosisSuggestions.length > 0 && (
                <div
                  className={`mt-1 border rounded shadow-lg max-h-40 overflow-y-auto z-20 ${
                    dark
                      ? "bg-gray-800 border-gray-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {diagnosisSuggestions.map((s, i) => (
                    <button
                      key={`suggestion-${s.label}-${i}`}
                      type="button"
                      onClick={() => applyDiagnosisSuggestion(s)}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 flex items-center gap-2 ${
                        dark ? "hover:bg-teal-900" : ""
                      }`}
                      data-ocid={`rx.diagnosis_suggestion.item.${i + 1}`}
                    >
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          s.type === "DIMS"
                            ? "border-blue-400 text-blue-600"
                            : "border-teal-400 text-teal-600"
                        }`}
                      >
                        {s.type}
                      </Badge>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {dimsActive && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                    <Sparkles className="w-3 h-3 mr-1" />
                    DIMS Active
                  </Badge>
                  <button
                    type="button"
                    onClick={() => {
                      setRxDrugs([]);
                      setDimsActive(false);
                    }}
                    className="text-[10px] text-red-500 underline"
                    data-ocid="rx.dims_reset.button"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* RX TABLE */}
            <div
              className={`rounded-lg p-3 ${
                dark ? "bg-gray-900" : "bg-white"
              } shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                  ℝ Prescription
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {rxDrugs.length} drug(s)
                </span>
              </div>
              {rxDrugs.length === 0 ? (
                <p
                  className="text-xs text-muted-foreground italic py-3 text-center"
                  data-ocid="rx.drugs.empty_state"
                >
                  No drugs added yet. Use the form below.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" data-ocid="rx.drugs.table">
                    <thead>
                      <tr
                        className={`border-b ${
                          dark ? "border-gray-700" : "border-gray-200"
                        }`}
                      >
                        {[
                          "#",
                          "Form",
                          "Drug Name",
                          "Dose",
                          "Route",
                          "Freq.",
                          "Duration",
                          "Instructions",
                          "Special Instr.",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left py-1 px-1 font-semibold text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rxDrugs.map((drug, idx) => (
                        <DrugRow
                          key={drug.id}
                          drug={drug}
                          index={idx}
                          dark={dark}
                          isEditing={editingDrugId === drug.id}
                          onEdit={() =>
                            setEditingDrugId(
                              editingDrugId === drug.id ? null : drug.id,
                            )
                          }
                          onDelete={() => deleteDrug(drug.id)}
                          onUpdate={(field, val) =>
                            updateDrug(drug.id, field, val)
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* MEDICATION INPUT FORM */}
            <div
              className={`rounded-lg p-3 ${
                dark ? "bg-gray-900" : "bg-white"
              } shadow-sm`}
            >
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide block mb-2">
                Add Medication
              </span>

              {/* Form selector pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {DRUG_FORMS.filter(Boolean).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDrugForm(f)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                      drugForm === f
                        ? "bg-teal-600 text-white border-teal-600"
                        : dark
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                    data-ocid="rx.drug_form.toggle"
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Drug name row */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    Generic Name
                  </span>
                  <div className="flex gap-1">
                    <input
                      className={`flex-1 border rounded px-2 py-1 text-xs ${
                        dark
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      }`}
                      value={drugName}
                      onChange={(e) => setDrugName(e.target.value)}
                      placeholder="Generic drug name..."
                      data-ocid="rx.drug_name.input"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        window.open("https://medex.com.bd/", "_blank")
                      }
                      className="px-1.5 py-1 rounded border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 text-[10px] flex items-center gap-0.5"
                      title="Search on Medex"
                      data-ocid="rx.medex_search.button"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Brand Name
                  </span>
                  <input
                    className={`w-full border rounded px-2 py-1 text-xs font-semibold ${
                      dark
                        ? "bg-gray-800 border-amber-600 text-white"
                        : "bg-amber-50 border-amber-300"
                    }`}
                    value={drugBrandName}
                    onChange={(e) => setDrugBrandName(e.target.value)}
                    placeholder="Brand (bold in table)"
                    data-ocid="rx.drug_brand_name.input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    Dose
                  </span>
                  <input
                    className={`w-full border rounded px-2 py-1 text-xs ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    value={drugDose}
                    onChange={(e) => setDrugDose(e.target.value)}
                    placeholder="500mg"
                    data-ocid="rx.drug_dose.input"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    Route (Bangla)
                  </span>
                  <Select value={drugRoute} onValueChange={setDrugRoute}>
                    <SelectTrigger
                      className="h-7 text-xs"
                      data-ocid="rx.drug_route.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTES_BN.map((r) => (
                        <SelectItem key={r.en} value={r.en} className="text-xs">
                          {r.bn} ({r.en})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-muted-foreground">
                    Frequency (Bangla primary)
                  </span>
                  <input
                    className={`w-full border rounded px-2 py-1 text-xs ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    value={drugFrequencyBn || drugFrequency}
                    onChange={(e) => {
                      setDrugFrequencyBn(e.target.value);
                      setDrugFrequency(e.target.value);
                    }}
                    placeholder="e.g. সকাল-রাত ১+০+১"
                    data-ocid="rx.drug_frequency.input"
                  />
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {FREQUENCY_PRESETS.map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() => {
                          setDrugFrequencyBn(p.bn);
                          setDrugFrequency(p.en);
                        }}
                        className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                      >
                        {p.bn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    Duration (Bangla)
                  </span>
                  <input
                    className={`w-full border rounded px-2 py-1 text-xs ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    value={drugDurationBn || drugDuration}
                    onChange={(e) => {
                      setDrugDurationBn(e.target.value);
                      setDrugDuration(e.target.value);
                    }}
                    placeholder="৭ দিন"
                    data-ocid="rx.drug_duration.input"
                  />
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() => {
                          setDrugDurationBn(p.bn);
                          setDrugDuration(p.en);
                        }}
                        className="text-[9px] px-1 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                      >
                        {p.bn}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    Instructions (Bangla)
                  </span>
                  <input
                    className={`w-full border rounded px-2 py-1 text-xs ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    value={drugInstructionBn || drugInstructions}
                    onChange={(e) => {
                      setDrugInstructionBn(e.target.value);
                      setDrugInstructions(e.target.value);
                    }}
                    placeholder="খাবার পরে"
                    data-ocid="rx.drug_instructions.input"
                  />
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {INSTRUCTION_PRESETS.map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() => {
                          setDrugInstructionBn(p.bn);
                          setDrugInstructions(p.en);
                        }}
                        className="text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                      >
                        {p.bn}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    Special Instruction (Bangla)
                  </span>
                  <input
                    className={`w-full border rounded px-2 py-1 text-xs ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    value={drugSpecialInstructionBn || drugSpecialInstruction}
                    onChange={(e) => {
                      setDrugSpecialInstructionBn(e.target.value);
                      setDrugSpecialInstruction(e.target.value);
                    }}
                    placeholder="যেমন: পানি বেশি পান করুন"
                    data-ocid="rx.drug_special_instruction.input"
                  />
                </div>
              </div>

              <Button
                size="sm"
                onClick={addDrug}
                className="bg-teal-700 hover:bg-teal-800 text-white"
                data-ocid="rx.add_drug.button"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add to Prescription
              </Button>
            </div>

            {/* TREATMENT TEMPLATE */}
            <div
              className={`rounded-lg ${
                dark ? "bg-gray-900" : "bg-white"
              } shadow-sm overflow-hidden`}
            >
              <button
                type="button"
                onClick={() => setShowTreatmentSection((s) => !s)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 ${
                  dark ? "hover:bg-teal-900" : ""
                } transition-colors`}
                data-ocid="rx.treatment_template.toggle"
              >
                <span>⚡ Load Treatment Template</span>
                {showTreatmentSection ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showTreatmentSection && (
                <div className="px-3 pb-3 space-y-2">
                  <input
                    className={`w-full border rounded px-2 py-1.5 text-xs ${
                      dark
                        ? "bg-gray-800 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                    placeholder="Search condition / diagnosis..."
                    value={treatmentQuery}
                    onChange={(e) => setTreatmentQuery(e.target.value)}
                    data-ocid="rx.treatment_search.input"
                  />
                  {treatmentResults.map((tpl, i) => (
                    <div
                      key={tpl.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        dark
                          ? "border-gray-700 bg-gray-800"
                          : "border-gray-100 bg-gray-50"
                      }`}
                      data-ocid={`rx.treatment_template.item.${i + 1}`}
                    >
                      <div>
                        <p className="text-xs font-medium">{tpl.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tpl.diagnosis} · {tpl.drugs.length} drugs
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyTreatmentTemplate(tpl)}
                        className="text-[10px] px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700"
                        data-ocid={`rx.load_template.button.${i + 1}`}
                      >
                        Load
                      </button>
                    </div>
                  ))}
                  {treatmentQuery.length >= 2 &&
                    treatmentResults.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No templates found.
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* ADVICE */}
            <div
              className={`rounded-lg p-3 ${
                dark ? "bg-gray-900" : "bg-white"
              } shadow-sm`}
            >
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide block mb-2">
                পরামর্শ / Advice (Bengali)
              </span>
              <div className="flex flex-wrap gap-1 mb-2">
                {ADVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAdviceCategory(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      adviceCategory === cat
                        ? "bg-teal-600 text-white border-teal-600"
                        : dark
                          ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                    data-ocid="rx.advice_category.tab"
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative mb-2">
                <input
                  className={`w-full border rounded px-2 py-1.5 text-xs pr-7 ${
                    dark
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-white border-gray-300"
                  }`}
                  placeholder="Search advice templates..."
                  value={adviceQuery}
                  onChange={(e) => setAdviceQuery(e.target.value)}
                  data-ocid="rx.advice_search.input"
                />
                <Search className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex flex-wrap gap-1 mb-3 max-h-28 overflow-y-auto">
                {filteredTemplates.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => appendAdvice(t.text)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors text-left ${
                        dark
                          ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-teal-900"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-teal-50"
                      }`}
                      data-ocid={`rx.advice_template.item.${i + 1}`}
                    >
                      {t.text}
                    </button>
                    {t.isCustom && (
                      <button
                        type="button"
                        onClick={() => removeCustomTemplate(t.id)}
                        className="text-red-400 hover:text-red-600"
                        data-ocid={`rx.advice_delete.button.${i + 1}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Textarea
                value={adviceText}
                onChange={(e) => setAdviceText(e.target.value)}
                rows={5}
                placeholder="পরামর্শ এখানে লিখুন বা টেমপ্লেট থেকে যোগ করুন..."
                className={`text-sm mb-2 ${
                  dark ? "bg-gray-800 border-gray-600 text-white" : ""
                }`}
                data-ocid="rx.advice.textarea"
              />
              <button
                type="button"
                onClick={() => setShowCustomForm((s) => !s)}
                className="text-[10px] text-teal-600 hover:underline flex items-center gap-1"
                data-ocid="rx.add_custom_template.button"
              >
                <Plus className="w-3 h-3" /> Add Custom Template
              </button>
              {showCustomForm && (
                <div
                  className={`mt-2 p-2 rounded border ${
                    dark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <Textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    rows={2}
                    placeholder="Custom advice text..."
                    className={`text-xs mb-1 ${
                      dark ? "bg-gray-700 border-gray-600" : ""
                    }`}
                    data-ocid="rx.custom_template.textarea"
                  />
                  <div className="flex gap-1">
                    <input
                      className={`flex-1 border rounded px-2 py-1 text-xs ${
                        dark
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300"
                      }`}
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Category"
                      data-ocid="rx.custom_category.input"
                    />
                    <button
                      type="button"
                      onClick={addCustomTemplate}
                      className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700"
                      data-ocid="rx.save_custom_template.button"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="px-2 py-1 text-xs rounded border"
                      data-ocid="rx.cancel_custom.button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PREVIEW TOGGLE */}
            <div>
              <button
                type="button"
                onClick={() => setShowPreview((s) => !s)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-t border text-xs font-semibold text-teal-700 ${
                  dark
                    ? "bg-gray-900 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
                data-ocid="rx.preview.toggle"
              >
                <span>
                  <Printer className="inline w-3.5 h-3.5 mr-1" />
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </span>
                {showPreview ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showPreview && (
                <PrescriptionPreview
                  withHeader={withHeader}
                  doctorInfo={doctorInfo}
                  name={name}
                  age={age}
                  sex={sex}
                  weight={weight}
                  rxDate={rxDate}
                  regNo={regNo}
                  diagnosis={diagnosis}
                  drugs={rxDrugs}
                  adviceText={adviceText}
                  cc={cc}
                  pmh={pmh}
                  oe={oe}
                  dh={dh}
                />
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// --- Sub-components ---

function DrugRow({
  drug,
  index,
  dark,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
}: {
  drug: RxDrug;
  index: number;
  dark: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (field: keyof RxDrug, val: string) => void;
}) {
  const cellCls = `px-1 py-1 align-top ${
    dark ? "border-gray-700" : "border-gray-100"
  } border-b`;
  const inp = `border rounded px-1 text-xs ${
    dark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
  }`;

  if (isEditing) {
    return (
      <tr data-ocid={`rx.drug.row.${index + 1}`}>
        <td className={cellCls}>{index + 1}</td>
        <td className={cellCls}>
          <select
            className={`${inp} w-14`}
            value={drug.drugForm}
            onChange={(e) => onUpdate("drugForm", e.target.value)}
          >
            {DRUG_FORMS.filter(Boolean).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </td>
        <td className={cellCls}>
          <div className="flex flex-col gap-0.5">
            <input
              className={`${inp} w-28`}
              value={drug.drugName}
              onChange={(e) => onUpdate("drugName", e.target.value)}
              placeholder="Generic"
            />
            <input
              className={`${inp} w-28 font-semibold`}
              value={drug.brandName}
              onChange={(e) => onUpdate("brandName", e.target.value)}
              placeholder="Brand"
            />
          </div>
        </td>
        <td className={cellCls}>
          <input
            className={`${inp} w-16`}
            value={drug.dose}
            onChange={(e) => onUpdate("dose", e.target.value)}
          />
        </td>
        <td className={cellCls}>
          <input
            className={`${inp} w-20`}
            value={drug.routeBn || drug.route}
            onChange={(e) => onUpdate("routeBn", e.target.value)}
          />
        </td>
        <td className={cellCls}>
          <input
            className={`${inp} w-20`}
            value={drug.frequencyBn || drug.frequency}
            onChange={(e) => onUpdate("frequencyBn", e.target.value)}
          />
        </td>
        <td className={cellCls}>
          <input
            className={`${inp} w-16`}
            value={drug.durationBn || drug.duration}
            onChange={(e) => onUpdate("durationBn", e.target.value)}
          />
        </td>
        <td className={cellCls}>
          <input
            className={`${inp} w-24`}
            value={drug.instructionBn || drug.instructions}
            onChange={(e) => onUpdate("instructionBn", e.target.value)}
          />
        </td>
        <td className={cellCls}>
          <input
            className={`${inp} w-24`}
            value={drug.specialInstructionBn || drug.specialInstruction}
            onChange={(e) => onUpdate("specialInstructionBn", e.target.value)}
          />
        </td>
        <td className={cellCls}>
          <button type="button" onClick={onEdit} className="text-teal-600">
            <Check className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
    );
  }
  return (
    <tr data-ocid={`rx.drug.row.${index + 1}`}>
      <td className={cellCls}>{index + 1}</td>
      <td className={cellCls}>
        <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 rounded px-1">
          {drug.drugForm}
        </span>
      </td>
      <td className={cellCls}>
        {drug.brandName ? (
          <div>
            <strong className="text-amber-700">{drug.brandName}</strong>
            <br />
            <span className="text-gray-500 text-[10px]">{drug.drugName}</span>
          </div>
        ) : drug.nameType === "brand" ? (
          <strong>{drug.drugName}</strong>
        ) : (
          <span>{drug.drugName}</span>
        )}
      </td>
      <td className={cellCls}>{drug.dose}</td>
      <td className={cellCls}>
        <span className="text-teal-700">{drug.routeBn || drug.route}</span>
      </td>
      <td className={cellCls}>{drug.frequencyBn || drug.frequency}</td>
      <td className={cellCls}>{drug.durationBn || drug.duration}</td>
      <td className={cellCls}>{drug.instructionBn || drug.instructions}</td>
      <td className={cellCls}>
        {drug.specialInstructionBn || drug.specialInstruction}
      </td>
      <td className={`${cellCls} flex gap-1`}>
        <button
          type="button"
          onClick={onEdit}
          className="text-blue-500 hover:text-blue-700"
          data-ocid={`rx.drug_edit.button.${index + 1}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-red-500 hover:text-red-700"
          data-ocid={`rx.drug_delete.button.${index + 1}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

function PrescriptionPreview({
  withHeader,
  doctorInfo,
  name,
  age,
  sex,
  weight,
  rxDate,
  regNo,
  diagnosis,
  drugs,
  adviceText,
  cc,
  pmh,
  oe,
  dh,
}: {
  withHeader: boolean;
  doctorInfo: Record<string, string> | null;
  name: string;
  age: string;
  sex: string;
  weight: string;
  rxDate: string;
  regNo: string;
  diagnosis: string;
  drugs: RxDrug[];
  adviceText: string;
  cc: string;
  pmh: string;
  oe: string;
  dh: string;
}) {
  const printId = "rx-preview-print";

  function handlePrint() {
    const el = document.getElementById(printId);
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Prescription</title>
      <style>
        body { font-family: serif; font-size: 11pt; margin: 20mm; }
        .header { border-bottom: 1px solid #333; padding-bottom: 6pt; margin-bottom: 8pt; display: flex; justify-content: space-between; }
        .patient-row { display: flex; gap: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; margin-bottom: 8pt; font-size: 9pt; }
        .cols { display: grid; grid-template-columns: 1fr 2fr; gap: 12pt; }
        .left-col { font-size: 9pt; }
        .section { margin-bottom: 6pt; }
        .section-label { font-weight: bold; font-size: 8pt; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        th, td { border-bottom: 1px solid #eee; padding: 2pt 4pt; text-align: left; }
        .advice { margin-top: 8pt; font-size: 9pt; }
        @media print { body { margin: 10mm; } }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div
      className="border border-t-0 border-gray-200 bg-white p-4 text-sm"
      data-ocid="rx.preview.panel"
    >
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1 text-xs px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700"
          data-ocid="rx.print.button"
        >
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
      </div>
      <div
        id={printId}
        className="font-serif text-gray-900 max-w-2xl mx-auto border border-gray-200 p-4 rounded"
      >
        {withHeader && (
          <div className="border-b pb-2 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-base">
                  {doctorInfo?.name ?? "Dr. Arman Kabir (ZOSID)"}
                </h2>
                <p className="text-xs text-gray-600">
                  {doctorInfo?.degrees ??
                    "MBBS (D.U.) | Emergency Medical Officer"}
                </p>
                <p className="text-xs text-gray-600">
                  {doctorInfo?.chamber ?? "সেন্চুরি আর্কেড মার্কেট, মগবাজার, ঢাকা"}
                </p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>Reg. no. A-105224</p>
                <p>Mob: 01751959262</p>
              </div>
            </div>
          </div>
        )}
        {/* Patient info */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs border-b pb-2 mb-3">
          {name && (
            <span>
              <strong>Name:</strong> {name}
            </span>
          )}
          {age && (
            <span>
              <strong>Age:</strong> {age}
            </span>
          )}
          {sex && (
            <span>
              <strong>Sex:</strong> {sex}
            </span>
          )}
          {weight && (
            <span>
              <strong>Weight:</strong> {weight}
            </span>
          )}
          {regNo && (
            <span>
              <strong>Reg:</strong> {regNo}
            </span>
          )}
          <span>
            <strong>Date:</strong> {rxDate}
          </span>
        </div>

        {/* Two-column layout: clinical summary left, Rx right */}
        <div className="grid grid-cols-5 gap-3">
          {/* Left column: clinical summary */}
          <div className="col-span-2 space-y-2 text-xs border-r pr-2">
            {cc && (
              <div>
                <div className="font-bold text-[10px] uppercase text-gray-500">
                  C/C
                </div>
                <div className="whitespace-pre-wrap">{cc}</div>
              </div>
            )}
            {pmh && (
              <div>
                <div className="font-bold text-[10px] uppercase text-gray-500">
                  P/M/H
                </div>
                <div className="whitespace-pre-wrap">{pmh}</div>
              </div>
            )}
            {dh && (
              <div>
                <div className="font-bold text-[10px] uppercase text-gray-500">
                  D/H
                </div>
                <div className="whitespace-pre-wrap">{dh}</div>
              </div>
            )}
            {oe && (
              <div>
                <div className="font-bold text-[10px] uppercase text-gray-500">
                  O/E
                </div>
                <div className="whitespace-pre-wrap">{oe}</div>
              </div>
            )}
          </div>

          {/* Right column: Rx */}
          <div className="col-span-3">
            {diagnosis && (
              <div className="mb-2">
                <span className="font-bold text-xs">Dx: </span>
                <span className="text-xs">{diagnosis}</span>
              </div>
            )}
            <div className="text-2xl font-bold mb-1">ℝ</div>
            {drugs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No medications added.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {[
                      "#",
                      "Drug",
                      "Dose",
                      "Route",
                      "Freq.",
                      "Duration",
                      "Instructions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left py-0.5 px-1 text-[10px] text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drugs.map((d, i) => (
                    <tr key={d.id} className="border-b border-gray-100">
                      <td className="px-1 py-0.5">{i + 1}</td>
                      <td className="px-1 py-0.5">
                        <span className="text-[10px] text-indigo-600 mr-1">
                          {d.drugForm}
                        </span>
                        {d.brandName ? (
                          <strong>{d.brandName}</strong>
                        ) : d.nameType === "brand" ? (
                          <strong>{d.drugName}</strong>
                        ) : (
                          d.drugName
                        )}
                        {d.brandName && d.drugName && (
                          <span className="text-gray-400 text-[10px] ml-1">
                            ({d.drugName})
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-0.5">{d.dose}</td>
                      <td className="px-1 py-0.5">{d.routeBn || d.route}</td>
                      <td className="px-1 py-0.5">
                        {d.frequencyBn || d.frequency}
                      </td>
                      <td className="px-1 py-0.5">
                        {d.durationBn || d.duration}
                      </td>
                      <td className="px-1 py-0.5">
                        {d.instructionBn || d.instructions}
                        {(d.specialInstructionBn || d.specialInstruction) && (
                          <span className="text-[9px] text-orange-600 block">
                            {d.specialInstructionBn || d.specialInstruction}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {adviceText && (
              <div className="mt-3 pt-2 border-t">
                <div className="font-bold text-[10px] uppercase text-gray-500 mb-1">
                  পরামর্শ
                </div>
                <div className="text-xs whitespace-pre-wrap">{adviceText}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
