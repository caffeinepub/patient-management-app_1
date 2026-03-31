import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Baby,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Droplets,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Stethoscope,
  Thermometer,
  Trash2,
  User,
  Wind,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Gender } from "../backend.d";
import type { Prescription, Visit } from "../backend.d";
import PatientChat from "../components/PatientChat";
import PatientForm from "../components/PatientForm";
import PrescriptionForm from "../components/PrescriptionForm";
import PrescriptionPad from "../components/PrescriptionPad";
import UpgradedPrescriptionEMR from "../components/UpgradedPrescriptionEMR";
import VisitForm from "../components/VisitForm";
import type { PatientAccount } from "../hooks/useEmailAuth";
import {
  isSignUpEnabled,
  loadPatientRegistry,
  setSignUpEnabled,
  useEmailAuth,
} from "../hooks/useEmailAuth";
import {
  getDoctorEmail,
  useCreatePrescription,
  useCreateVisit,
  useDeletePatient,
  useGetPatient,
  useGetPrescriptionsByPatient,
  useGetVisitsByPatient,
  useUpdatePatient,
} from "../hooks/useQueries";

const PATIENT_SUBMISSIONS_KEY = "medicare_patient_submissions";

export interface PatientSubmission {
  id: string;
  patientId: string;
  type: "complaint" | "vitals" | "investigation";
  data: Record<string, string>;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
}

function loadSubmissions(): PatientSubmission[] {
  try {
    const raw = localStorage.getItem(PATIENT_SUBMISSIONS_KEY);
    if (raw) return JSON.parse(raw) as PatientSubmission[];
  } catch {}
  return [];
}

function saveSubmissions(subs: PatientSubmission[]) {
  localStorage.setItem(PATIENT_SUBMISSIONS_KEY, JSON.stringify(subs));
}

function getAge(dateOfBirth?: bigint): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(Number(dateOfBirth / 1000000n));
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function formatTime(time: bigint): string {
  return format(new Date(Number(time / 1000000n)), "MMM d, yyyy");
}

function formatDateTime(time: bigint): string {
  return format(new Date(Number(time / 1000000n)), "MMM d, yyyy 'at' h:mm a");
}

function vitalStatus(key: string, value: string): "normal" | "high" | "low" {
  if (!value || value === "—") return "normal";
  const num = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(num)) return "normal";
  if (key === "bloodPressure") {
    const systolic = Number.parseInt(value.split("/")[0] || "0");
    if (systolic > 140) return "high";
    if (systolic < 90) return "low";
  }
  if (key === "pulse") {
    if (num > 100) return "high";
    if (num < 60) return "low";
  }
  if (key === "temperature") {
    if (num > 37.5) return "high";
    if (num < 36) return "low";
  }
  if (key === "oxygenSaturation") {
    if (num < 95) return "low";
  }
  return "normal";
}

function calcMAP(bp: string): number | null {
  const parts = bp.split("/");
  if (parts.length !== 2) return null;
  const sbp = Number.parseInt(parts[0]);
  const dbp = Number.parseInt(parts[1]);
  if (Number.isNaN(sbp) || Number.isNaN(dbp)) return null;
  return Math.round(dbp + (sbp - dbp) / 3);
}

interface Props {
  patientId?: bigint | null;
  currentRole: "admin" | "doctor" | "staff" | "patient";
  currentPatient?: PatientAccount | null;
  onBack?: () => void;
}

export default function PatientDashboard({
  patientId: propPatientId,
  currentRole,
  currentPatient: _patientAccount,
  onBack,
}: Props) {
  const search = useSearch({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const patientId = propPatientId ?? (search.id ? BigInt(search.id) : null);

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxInitialDiagnosis, setRxInitialDiagnosis] = useState<
    string | undefined
  >(undefined);

  const [rxVisitExtendedData, setRxVisitExtendedData] = useState<
    Record<string, unknown> | undefined
  >(undefined);
  const [rxPatientRegisterNumber, setRxPatientRegisterNumber] = useState<
    string | undefined
  >(undefined);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [savedPads, setSavedPads] = useState<any[]>([]);
  const [editRx, setEditRx] = useState<Prescription | null>(null);
  const [showPadPreview, setShowPadPreview] = useState(false);
  const [padPrescription, setPadPrescription] = useState<Prescription | null>(
    null,
  );

  // Pregnancy state
  const getPregnancyData = () => {
    if (!patientId) return null;
    try {
      const raw = localStorage.getItem(`pregnancy_${patientId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const [pregnancyData, setPregnancyData] = useState<{
    lmp: string;
    gravida: string;
    para: string;
    active: boolean;
  } | null>(() => getPregnancyData());
  const [showPregnancyForm, setShowPregnancyForm] = useState(false);
  const [lmpInput, setLmpInput] = useState("");
  const [gravidaInput, setGravidaInput] = useState("");
  const [paraInput, setParaInput] = useState("");

  const loadSavedPads = () => {
    if (!patientId) return;
    try {
      const raw = localStorage.getItem(`savedPrescriptionPads_${patientId}`);
      if (raw) setSavedPads(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  };

  const savePregnancyData = () => {
    if (!patientId || !lmpInput) return;
    const data = {
      lmp: lmpInput,
      gravida: gravidaInput,
      para: paraInput,
      active: true,
    };
    localStorage.setItem(`pregnancy_${patientId}`, JSON.stringify(data));
    setPregnancyData(data);
    setShowPregnancyForm(false);
  };

  const clearPregnancyData = () => {
    if (!patientId) return;
    localStorage.removeItem(`pregnancy_${patientId}`);
    setPregnancyData(null);
    setShowPregnancyForm(false);
  };

  const calcPregnancy = (lmp: string) => {
    const lmpDate = new Date(lmp);
    const now = new Date();
    const diffMs = now.getTime() - lmpDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const months = (weeks / 4.33).toFixed(1);
    const edd = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    return {
      weeks,
      months,
      edd: edd.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  };

  const [invSearch, setInvSearch] = useState("");
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [submitTab, setSubmitTab] = useState("complaint");
  const [submissions, setSubmissions] = useState<PatientSubmission[]>(() =>
    loadSubmissions(),
  );

  // Submission form state
  const [complaint, setComplaint] = useState("");
  const [vitalFields, setVitalFields] = useState({
    systolic: "",
    diastolic: "",
    pulse: "",
    temp: "",
    spo2: "",
    weight: "",
    height: "",
  });
  const [invFields, setInvFields] = useState({
    name: "",
    date: "",
    result: "",
    unit: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: patient, isLoading: loadingPatient } = useGetPatient(
    patientId ?? 0n,
  );

  // ── Account Settings state (needs patient) ────────────────────────────────────
  const registerNo = (patient as any)?.registerNumber as string | undefined;
  // signUpEnabled is read from localStorage - state only for optimistic updates
  const [_signUpEnabledOverride, setSignUpEnabledState] = useState<
    boolean | null
  >(null);
  const signUpEnabled =
    _signUpEnabledOverride !== null
      ? _signUpEnabledOverride
      : registerNo
        ? isSignUpEnabled(registerNo)
        : false;
  const [acctNewPhone, setAcctNewPhone] = useState("");
  const [acctNewPassword, setAcctNewPassword] = useState("");

  const { updatePatientCredentials } = useEmailAuth();

  const handleToggleSignUp = (checked: boolean) => {
    if (!registerNo) return;
    setSignUpEnabled(registerNo, checked);
    setSignUpEnabledState(checked); // optimistic update
    import("sonner").then(({ toast }) =>
      toast.success(
        checked
          ? "Sign-up enabled for this patient"
          : "Sign-up disabled for this patient",
      ),
    );
  };

  const handleSaveAccountSettings = () => {
    if (!registerNo) return;
    if (!acctNewPhone && !acctNewPassword) {
      import("sonner").then(({ toast }) =>
        toast.error("Please enter a new phone number or password to save."),
      );
      return;
    }
    updatePatientCredentials(
      registerNo,
      acctNewPhone || undefined,
      acctNewPassword || undefined,
    );
    setAcctNewPhone("");
    setAcctNewPassword("");
    import("sonner").then(({ toast }) =>
      toast.success("Patient account credentials updated"),
    );
  };

  const linkedAccount = registerNo
    ? loadPatientRegistry().find(
        (p) => p.registerNumber?.toLowerCase() === registerNo.toLowerCase(),
      )
    : undefined;
  const { data: visits = [], isLoading: loadingVisits } = useGetVisitsByPatient(
    patientId ?? 0n,
  );
  const { data: prescriptions = [], isLoading: loadingRx } =
    useGetPrescriptionsByPatient(patientId ?? 0n);
  const updateMutation = useUpdatePatient();
  const createVisitMutation = useCreateVisit();
  const createRxMutation = useCreatePrescription();
  const deleteMutation = useDeletePatient();

  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => Number(b.visitDate - a.visitDate)),
    [visits],
  );
  const latestVisit = sortedVisits[0] ?? null;

  // Get vitals from visits for chart
  const vitalsHistory = useMemo(() => {
    const doctorEmail = getDoctorEmail();
    return sortedVisits
      .slice()
      .reverse()
      .map((v) => {
        let extra: any = {};
        try {
          const raw = localStorage.getItem(
            `visit_form_data_${v.id}_${doctorEmail}`,
          );
          if (raw) extra = JSON.parse(raw)?.vitalSigns || {};
        } catch {}
        const bp = extra.bloodPressure || v.vitalSigns?.bloodPressure || "";
        const systolic = bp ? Number.parseInt(bp.split("/")[0] || "0") : null;
        const diastolic = bp ? Number.parseInt(bp.split("/")[1] || "0") : null;
        const map =
          systolic && diastolic
            ? Math.round(diastolic + (systolic - diastolic) / 3)
            : null;
        const wt =
          Number.parseFloat(extra.weight || String(patient?.weight || "")) ||
          null;
        const ht =
          Number.parseFloat(extra.height || String(patient?.height || "")) ||
          null;
        const bmi =
          wt && ht
            ? Math.round((wt / ((ht / 100) * (ht / 100))) * 10) / 10
            : null;
        return {
          date: format(new Date(Number(v.visitDate / 1000000n)), "MMM d"),
          BP: systolic || null,
          Diastolic: diastolic || null,
          MAP: map,
          Pulse:
            Number.parseFloat(extra.pulse || v.vitalSigns?.pulse || "") || null,
          Temp:
            Number.parseFloat(
              extra.temperature || v.vitalSigns?.temperature || "",
            ) || null,
          SpO2:
            Number.parseFloat(
              extra.oxygenSaturation || v.vitalSigns?.oxygenSaturation || "",
            ) || null,
          Weight: wt,
          RespRate:
            Number.parseFloat(
              extra.respiratoryRate || v.vitalSigns?.respiratoryRate || "",
            ) || null,
          BMI: bmi,
        };
      })
      .filter((r) => r.BP || r.Pulse || r.Temp || r.SpO2);
  }, [sortedVisits, patient]);

  // Get latest vitals
  const latestVitals = useMemo(() => {
    if (!latestVisit) return null;
    try {
      const doctorEmail = getDoctorEmail();
      const raw = localStorage.getItem(
        `visit_form_data_${latestVisit.id}_${doctorEmail}`,
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.vitalSigns as Record<string, string> | null;
      }
    } catch {}
    return null;
  }, [latestVisit]);

  // Get all investigation rows across visits
  const allInvestigations = useMemo(() => {
    const doctorEmail = getDoctorEmail();
    const rows: Array<{
      date: string;
      name: string;
      result: string;
      unit?: string;
      interpretation?: string;
    }> = [];
    for (const v of sortedVisits) {
      try {
        const raw = localStorage.getItem(
          `visit_form_data_${v.id}_${doctorEmail}`,
        );
        if (raw) {
          const parsed = JSON.parse(raw);
          const invRows = parsed.previous_investigation_rows as typeof rows;
          if (Array.isArray(invRows)) rows.push(...invRows);
        }
      } catch {}
    }
    return rows;
  }, [sortedVisits]);

  // Group by investigation name for charts
  const invByName = useMemo(() => {
    const map: Record<
      string,
      { data: Array<{ date: string; value: number }>; unit: string }
    > = {};
    for (const row of allInvestigations) {
      if (!row.name || !row.result) continue;
      const num = Number.parseFloat(row.result);
      if (Number.isNaN(num)) continue;
      if (!map[row.name]) map[row.name] = { data: [], unit: row.unit || "" };
      map[row.name].data.push({ date: row.date || "?", value: num });
    }
    return map;
  }, [allInvestigations]);

  const filteredInvRows = useMemo(() => {
    if (!invSearch) return allInvestigations.slice(0, 50);
    return allInvestigations.filter((r) =>
      r.name.toLowerCase().includes(invSearch.toLowerCase()),
    );
  }, [allInvestigations, invSearch]);

  // Patient submissions for this patient
  const patientSubmissions = useMemo(() => {
    if (!patientId) return [];
    return submissions.filter((s) => s.patientId === String(patientId));
  }, [submissions, patientId]);

  function refreshSubmissions() {
    setSubmissions(loadSubmissions());
  }

  function downloadVisitHistoryPDF() {
    if (!patient) return;
    const shown = sortedVisits.filter((v) => {
      try {
        const doctorEmail = getDoctorEmail();
        const raw = localStorage.getItem(
          `visit_form_data_${v.id}_${doctorEmail}`,
        );
        if (raw) {
          const d = JSON.parse(raw);
          return d.showToPatient !== false;
        }
      } catch {}
      return true;
    });
    const rows = shown
      .map((v, i) => {
        let diag = "";
        try {
          const doctorEmail = getDoctorEmail();
          const raw = localStorage.getItem(
            `visit_form_data_${v.id}_${doctorEmail}`,
          );
          if (raw) diag = JSON.parse(raw).diagnosis || "";
        } catch {}
        return `<tr><td>${i + 1}</td><td>${format(new Date(Number(v.visitDate / 1000000n)), "MMM d, yyyy")}</td><td>${v.visitType || "—"}</td><td>${diag || "—"}</td></tr>`;
      })
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>Visit History - ${patient.fullName}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0;font-weight:bold}h2{color:#0f766e}</style></head><body><h2>Visit History — ${patient.fullName}</h2><p>Register No: ${"—"} | Generated: ${new Date().toLocaleDateString()}</p><table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Diagnosis</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    win.document.close();
    win.print();
  }

  function downloadPrescriptionsPDF() {
    if (!patient) return;
    const rxs = [...prescriptions].sort((a, b) =>
      Number(b.prescriptionDate - a.prescriptionDate),
    );
    const rows = rxs
      .map((rx, i) => {
        const meds = rx.medications
          .map(
            (m: any) =>
              `${m.drugForm || ""} ${m.drugName || ""} ${m.dose || ""} — ${m.frequency || ""} × ${m.duration || ""}`,
          )
          .join("<br/>");
        return `<tr><td>${i + 1}</td><td>${format(new Date(Number(rx.prescriptionDate / 1000000n)), "MMM d, yyyy")}</td><td>${rx.diagnosis || "—"}</td><td>${meds || "—"}</td></tr>`;
      })
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>Prescriptions - ${patient.fullName}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}th{background:#f0f0f0;font-weight:bold}h2{color:#0f766e}</style></head><body><h2>Prescriptions — ${patient.fullName}</h2><p>Register No: ${"—"} | Generated: ${new Date().toLocaleDateString()}</p><table><thead><tr><th>#</th><th>Date</th><th>Diagnosis</th><th>Medications</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    win.document.close();
    win.print();
  }

  function openRxForm(
    diagnosis?: string,
    _visitId?: bigint,
    extendedData?: Record<string, unknown>,
    regNum?: string,
  ) {
    setRxInitialDiagnosis(diagnosis);

    setRxVisitExtendedData(extendedData);
    setRxPatientRegisterNumber(regNum);
    setShowRxForm(true);
  }

  function closeRxForm() {
    setShowRxForm(false);
    setRxInitialDiagnosis(undefined);

    setRxVisitExtendedData(undefined);
    setRxPatientRegisterNumber(undefined);
  }

  function handleSubmitData() {
    if (!patientId) return;
    let type: PatientSubmission["type"] = "complaint";
    let data: Record<string, string> = {};
    if (submitTab === "complaint") {
      if (!complaint.trim()) {
        toast.error("Please describe your symptoms");
        return;
      }
      type = "complaint";
      data = { complaint };
    } else if (submitTab === "vitals") {
      type = "vitals";
      data = { ...vitalFields };
    } else {
      if (!invFields.name || !invFields.result) {
        toast.error("Please enter investigation name and result");
        return;
      }
      type = "investigation";
      data = { ...invFields, fileName: uploadFile?.name || "" };
    }
    const sub: PatientSubmission = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      patientId: String(patientId),
      type,
      data,
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    const all = loadSubmissions();
    all.push(sub);
    saveSubmissions(all);
    refreshSubmissions();
    toast.success("Data submitted! Awaiting doctor approval.");
    setShowSubmitPanel(false);
    setComplaint("");
    setVitalFields({
      systolic: "",
      diastolic: "",
      pulse: "",
      temp: "",
      spo2: "",
      weight: "",
      height: "",
    });
    setInvFields({ name: "", date: "", result: "", unit: "" });
    setUploadFile(null);
  }

  function approveSubmission(id: string) {
    const all = loadSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "approved" };
      saveSubmissions(all);
      refreshSubmissions();
      toast.success("Submission approved");
    }
  }

  function rejectSubmission(id: string) {
    const all = loadSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "rejected" };
      saveSubmissions(all);
      refreshSubmissions();
      toast.success("Submission rejected");
    }
  }

  if (loadingPatient) {
    return (
      <div
        className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4"
        data-ocid="patient_dashboard.loading_state"
      >
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="w-60 h-80 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div
          className="text-center py-20"
          data-ocid="patient_dashboard.error_state"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-2">Patient not found</p>
          <Button
            variant="outline"
            onClick={() => (onBack ? onBack() : navigate({ to: "/Patients" }))}
            className="mt-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  const age = getAge(patient.dateOfBirth);
  const initials = patient.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const pendingCount = patientSubmissions.filter(
    (s) => s.status === "pending",
  ).length;

  return (
    <div
      className="flex min-h-screen bg-gray-50"
      data-ocid="patient_dashboard.page"
    >
      {/* LEFT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen shadow-sm flex-shrink-0">
        <div className="p-5 border-b border-gray-100 flex flex-col items-center text-center gap-3">
          {(patient as any).photo ? (
            <img
              src={(patient as any).photo}
              alt={patient.fullName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-2xl">
              {initials}
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900 text-base">
              {patient.fullName}
            </p>
            {(patient as any).registerNumber && (
              <p className="text-xs text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded mt-1">
                {(patient as any).registerNumber}
              </p>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2.5 text-sm">
            {patient.gender && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="capitalize">
                  {patient.gender} · {age ? `${age} yrs` : "Age N/A"}
                </span>
              </div>
            )}
            {patient.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.address && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{patient.address}</span>
              </div>
            )}
            {patient.bloodGroup && (
              <div className="flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="font-semibold text-red-600">
                  {patient.bloodGroup}
                </span>
              </div>
            )}
            {(patient.chronicConditions?.length > 0 ||
              patient.allergies?.length > 0) && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                {patient.chronicConditions?.length > 0 && (
                  <div className="bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <p className="text-xs font-semibold text-amber-700 mb-0.5">
                      Conditions
                    </p>
                    <p className="text-xs text-amber-600">
                      {patient.chronicConditions.join(", ")}
                    </p>
                  </div>
                )}
                {patient.allergies?.length > 0 && (
                  <div className="bg-red-50 rounded-lg px-2.5 py-1.5">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">
                      Allergies
                    </p>
                    <p className="text-xs text-red-600">
                      {patient.allergies.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-gray-100 space-y-2">
          {(currentRole === "doctor" || currentRole === "admin") && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => setShowEditForm(true)}
              data-ocid="patient_dashboard.edit_button"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </Button>
          )}
          {currentRole === "admin" && (
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
              data-ocid="patient_dashboard.delete_button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Patient
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-full gap-2 text-sm text-gray-500"
            onClick={() => (onBack ? onBack() : navigate({ to: "/Patients" }))}
            data-ocid="patient_dashboard.link"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Patients
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <nav className="flex items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={() =>
                  onBack ? onBack() : navigate({ to: "/Patients" })
                }
                className="text-gray-500 hover:text-teal-600 font-medium"
                data-ocid="patient_dashboard.link"
              >
                Patients
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-800 font-semibold">
                {patient.fullName}
              </span>
            </nav>
            <div className="flex items-center gap-2">
              {/* Mobile back */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden gap-1 text-xs"
                onClick={() =>
                  onBack ? onBack() : navigate({ to: "/Patients" })
                }
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-4">
          <Tabs defaultValue="overview" className="w-full">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* LEFT SIDEBAR — vertical on desktop, horizontal scroll on mobile */}
              <div className="lg:w-56 shrink-0">
                <TabsList className="flex flex-row lg:flex-col w-full h-auto p-1.5 gap-1.5 bg-gray-100 rounded-xl overflow-x-auto lg:overflow-x-visible">
                  <TabsTrigger
                    value="overview"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    🏠 Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="vitals"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    ❤️ Vitals
                  </TabsTrigger>
                  <TabsTrigger
                    value="investigations"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    🧪 Investigations
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    📋 History
                  </TabsTrigger>
                  <TabsTrigger
                    value="prescriptions"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    💊 Prescriptions
                  </TabsTrigger>
                  <TabsTrigger
                    value="appointments"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    📅 Appointments
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium relative data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    ⏳ Pending Approvals
                    {pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="chat"
                    className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                    data-ocid="patient_dashboard.tab"
                  >
                    💬 Chat
                  </TabsTrigger>
                  {(currentRole === "doctor" || currentRole === "admin") && (
                    <TabsTrigger
                      value="account"
                      className="w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 font-medium data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md"
                      data-ocid="patient_dashboard.account.tab"
                    >
                      ⚙️ Account
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              {/* RIGHT CONTENT */}
              <div className="flex-1 min-w-0">
                {/* ── OVERVIEW ── */}
                <TabsContent value="overview" className="space-y-4">
                  {/* Profile card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px]">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-teal-600" />
                          Patient Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            [
                              "Sex",
                              patient.gender
                                ? patient.gender === "male"
                                  ? "Male"
                                  : patient.gender === "female"
                                    ? "Female"
                                    : "Other"
                                : "N/A",
                            ],
                            ["Age", age ? `${age} years` : "N/A"],
                            ["Blood Group", patient.bloodGroup || "N/A"],
                            [
                              "Status",
                              latestVisit ? "Under Treatment" : "Active",
                            ],
                            [
                              "Last Visit",
                              latestVisit
                                ? formatTime(latestVisit.visitDate)
                                : "No visits",
                            ],
                            [
                              "Register No.",
                              (patient as any).registerNumber || "N/A",
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="bg-gray-50 rounded-lg p-2.5"
                            >
                              <p className="text-xs text-gray-400 mb-0.5">
                                {label}
                              </p>
                              <p className="font-medium text-gray-800 text-sm">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {latestVisit && (
                        <div className="flex-1 min-w-[200px]">
                          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                            Latest Visit
                          </h3>
                          <div className="bg-blue-50 rounded-xl p-3 text-sm space-y-2">
                            <p className="text-xs text-blue-500">
                              {formatTime(latestVisit.visitDate)}
                            </p>
                            {latestVisit.diagnosis && (
                              <p className="font-semibold text-blue-800">
                                {latestVisit.diagnosis}
                              </p>
                            )}
                            {latestVisit.chiefComplaint && (
                              <p className="text-blue-700 text-xs">
                                {latestVisit.chiefComplaint}
                              </p>
                            )}
                            <Badge className="text-xs border-0 bg-amber-100 text-amber-700">
                              Under Treatment
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quick vitals */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-rose-500" />
                      Latest Vitals
                      {latestVisit && (
                        <span className="text-xs font-normal text-gray-400">
                          from {formatTime(latestVisit.visitDate)}
                        </span>
                      )}
                    </h3>
                    <VitalsBar
                      vitals={latestVitals}
                      weight={patient.weight}
                      height={patient.height}
                    />
                  </div>

                  {/* Pregnancy Card — only for female patients */}
                  {patient.gender === Gender.female &&
                    (currentRole === "doctor" || currentRole === "admin") && (
                      <div className="bg-white rounded-xl border border-pink-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Baby className="w-4 h-4 text-pink-500" />
                            Pregnancy Status
                          </h3>
                          <div className="flex gap-2">
                            {pregnancyData?.active && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-300 text-red-600"
                                onClick={clearPregnancyData}
                                data-ocid="patient_dashboard.pregnancy.delete_button"
                              >
                                Clear
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-pink-300 text-pink-600"
                              onClick={() =>
                                setShowPregnancyForm(!showPregnancyForm)
                              }
                              data-ocid="patient_dashboard.pregnancy.edit_button"
                            >
                              {pregnancyData?.active
                                ? "Update"
                                : "Set Pregnancy"}
                            </Button>
                          </div>
                        </div>

                        {showPregnancyForm && (
                          <div
                            className="bg-pink-50 rounded-lg p-3 mb-3 space-y-2 border border-pink-100"
                            data-ocid="patient_dashboard.pregnancy.panel"
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label
                                  htmlFor="preg-lmp"
                                  className="text-xs text-gray-500 mb-1 block"
                                >
                                  LMP Date
                                </label>
                                <input
                                  id="preg-lmp"
                                  type="date"
                                  value={lmpInput}
                                  onChange={(e) => setLmpInput(e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                                  data-ocid="patient_dashboard.pregnancy.input"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="preg-gravida"
                                  className="text-xs text-gray-500 mb-1 block"
                                >
                                  Gravida
                                </label>
                                <input
                                  id="preg-gravida"
                                  type="number"
                                  min="0"
                                  value={gravidaInput}
                                  onChange={(e) =>
                                    setGravidaInput(e.target.value)
                                  }
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                                  placeholder="e.g. 2"
                                  data-ocid="patient_dashboard.pregnancy.input"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="preg-para"
                                  className="text-xs text-gray-500 mb-1 block"
                                >
                                  Para
                                </label>
                                <input
                                  id="preg-para"
                                  type="number"
                                  min="0"
                                  value={paraInput}
                                  onChange={(e) => setParaInput(e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                                  placeholder="e.g. 1"
                                  data-ocid="patient_dashboard.pregnancy.input"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={savePregnancyData}
                              className="bg-pink-600 hover:bg-pink-700 text-white"
                              data-ocid="patient_dashboard.pregnancy.save_button"
                            >
                              Save
                            </Button>
                          </div>
                        )}

                        {pregnancyData?.active && pregnancyData.lmp ? (
                          (() => {
                            const info = calcPregnancy(pregnancyData.lmp);
                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-pink-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-pink-600">
                                      {info.weeks}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Weeks
                                    </p>
                                  </div>
                                  <div className="bg-rose-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-rose-600">
                                      {info.months}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Months
                                    </p>
                                  </div>
                                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                                    <p className="text-xs font-bold text-purple-600">
                                      {info.edd}
                                    </p>
                                    <p className="text-xs text-gray-500">EDD</p>
                                  </div>
                                </div>
                                {pregnancyData.gravida && (
                                  <p className="text-xs text-gray-500">
                                    G{pregnancyData.gravida}P
                                    {pregnancyData.para || 0}
                                  </p>
                                )}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                    <HeartPulse className="w-3.5 h-3.5 text-pink-500" />{" "}
                                    Pregnancy Advice
                                  </p>
                                  {[
                                    "Take folic acid 400–800 mcg daily",
                                    "Prenatal vitamins as prescribed",
                                    "Avoid alcohol, tobacco, raw fish",
                                    `Next scan at ${info.weeks < 20 ? "20" : "32"} weeks`,
                                    "Monitor BP and blood sugar regularly",
                                    "Emergency: severe headache, blurred vision, or bleeding → visit immediately",
                                  ].map((adv) => (
                                    <p
                                      key={adv}
                                      className="text-xs text-gray-600 flex items-start gap-1.5 bg-pink-50/60 rounded px-2 py-1"
                                    >
                                      <span className="text-pink-400 mt-0.5">
                                        •
                                      </span>
                                      {adv}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <p
                            className="text-sm text-gray-400 text-center py-2"
                            data-ocid="patient_dashboard.pregnancy.empty_state"
                          >
                            No active pregnancy recorded
                          </p>
                        )}
                      </div>
                    )}
                </TabsContent>

                {/* ── VITALS ── */}
                <TabsContent value="vitals" className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Vital Signs Summary
                    </h3>
                    <VitalsBar
                      vitals={latestVitals}
                      weight={patient.weight}
                      height={patient.height}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Blood Pressure + MAP */}
                    {vitalsHistory.filter((r) => r.BP).length >= 2 ? (
                      <div className="bg-rose-50 rounded-xl border border-rose-200 shadow-sm p-4">
                        <h4 className="font-semibold text-rose-800 mb-3 text-sm flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          Blood Pressure
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#fecdd3"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "mmHg",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="BP"
                              stroke="#ef4444"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Systolic"
                            />
                            <Line
                              type="monotone"
                              dataKey="Diastolic"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Diastolic"
                            />
                            <Line
                              type="monotone"
                              dataKey="MAP"
                              stroke="#16a34a"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 3 }}
                              name="MAP"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 text-center text-rose-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">
                          Blood Pressure — need 2+ visits
                        </p>
                      </div>
                    )}
                    {/* Pulse */}
                    {vitalsHistory.filter((r) => r.Pulse).length >= 2 ? (
                      <div className="bg-orange-50 rounded-xl border border-orange-200 shadow-sm p-4">
                        <h4 className="font-semibold text-orange-800 mb-3 text-sm flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          Pulse Rate
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#fed7aa"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "bpm",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="Pulse"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Pulse (bpm)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center text-orange-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">Pulse — need 2+ visits</p>
                      </div>
                    )}
                    {/* SpO2 */}
                    {vitalsHistory.filter((r) => r.SpO2).length >= 2 ? (
                      <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-4">
                        <h4 className="font-semibold text-blue-800 mb-3 text-sm flex items-center gap-1">
                          <Wind className="w-4 h-4" />
                          SpO₂
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#bfdbfe"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              domain={[85, 100]}
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "%",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="SpO2"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="SpO₂ (%)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center text-blue-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">SpO₂ — need 2+ visits</p>
                      </div>
                    )}
                    {/* Temperature */}
                    {vitalsHistory.filter((r) => r.Temp).length >= 2 ? (
                      <div className="bg-purple-50 rounded-xl border border-purple-200 shadow-sm p-4">
                        <h4 className="font-semibold text-purple-800 mb-3 text-sm flex items-center gap-1">
                          <Thermometer className="w-4 h-4" />
                          Temperature
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e9d5ff"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "°F",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="Temp"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Temp (°F)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 text-center text-purple-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">Temperature — need 2+ visits</p>
                      </div>
                    )}
                    {/* Weight */}
                    {vitalsHistory.filter((r) => r.Weight).length >= 2 ? (
                      <div className="bg-teal-50 rounded-xl border border-teal-200 shadow-sm p-4">
                        <h4 className="font-semibold text-teal-800 mb-3 text-sm flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Weight
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#99f6e4"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "kg",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="Weight"
                              stroke="#0d9488"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Weight (kg)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-teal-50 rounded-xl border border-teal-200 p-4 text-center text-teal-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">Weight — need 2+ visits</p>
                      </div>
                    )}
                    {/* BMI Trend */}
                    {vitalsHistory.filter((r) => r.BMI).length >= 2 ? (
                      <div className="bg-indigo-50 rounded-xl border border-indigo-200 shadow-sm p-4">
                        <h4 className="font-semibold text-indigo-800 mb-3 text-sm flex items-center gap-1">
                          <Activity className="w-4 h-4" />
                          BMI Trend
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#c7d2fe"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "kg/m²",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="BMI"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="BMI (kg/m²)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 text-center text-indigo-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">
                          BMI Trend — need height + 2+ visits
                        </p>
                      </div>
                    )}
                    {/* Respiratory Rate */}
                    {vitalsHistory.filter((r) => r.RespRate).length >= 2 ? (
                      <div className="bg-cyan-50 rounded-xl border border-cyan-200 shadow-sm p-4">
                        <h4 className="font-semibold text-cyan-800 mb-3 text-sm flex items-center gap-1">
                          <Wind className="w-4 h-4" />
                          Respiratory Rate
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={vitalsHistory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#a5f3fc"
                            />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              label={{
                                value: "/min",
                                angle: -90,
                                position: "insideLeft",
                                style: { fontWeight: "bold", fontSize: 10 },
                              }}
                            />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="RespRate"
                              stroke="#0891b2"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              name="Resp Rate (/min)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-4 text-center text-cyan-300">
                        <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">
                          Respiratory Rate — need 2+ visits
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Pending patient vitals */}
                  {patientSubmissions
                    .filter(
                      (s) => s.type === "vitals" && s.status === "pending",
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
                      >
                        <Badge className="mt-0.5 bg-amber-100 text-amber-700 border-0 text-xs">
                          Pending
                        </Badge>
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-amber-800">
                            Patient-submitted vitals
                          </p>
                          <p className="text-amber-600 text-xs">
                            {format(new Date(s.timestamp), "MMM d, yyyy HH:mm")}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(s.data).map(
                              ([k, v]) =>
                                v && (
                                  <span
                                    key={k}
                                    className="text-xs bg-white border border-amber-200 rounded px-2 py-0.5"
                                  >
                                    {k}: {v}
                                  </span>
                                ),
                            )}
                          </div>
                        </div>
                        {(currentRole === "doctor" ||
                          currentRole === "admin") && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-700 border-emerald-300 gap-1"
                              onClick={() => approveSubmission(s.id)}
                              data-ocid="patient_dashboard.confirm_button"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 gap-1"
                              onClick={() => rejectSubmission(s.id)}
                              data-ocid="patient_dashboard.cancel_button"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                </TabsContent>

                {/* ── INVESTIGATIONS ── */}
                <TabsContent value="investigations" className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-purple-600" />
                        Investigation Reports
                      </h3>
                      <div className="relative w-52">
                        <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search investigation..."
                          value={invSearch}
                          onChange={(e) => setInvSearch(e.target.value)}
                          className="pl-8 h-8 text-sm"
                          data-ocid="patient_dashboard.search_input"
                        />
                      </div>
                    </div>
                    {filteredInvRows.length === 0 ? (
                      <div
                        className="text-center py-8"
                        data-ocid="patient_dashboard.investigations.empty_state"
                      >
                        <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          No investigation reports found
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              {[
                                "Investigation",
                                "Result",
                                "Unit",
                                "Date",
                                "Interpretation",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredInvRows.map((row, i) => (
                              <tr
                                key={`inv-${row.name}-${row.date}-${i}`}
                                className="border-b border-gray-50 hover:bg-gray-50"
                                data-ocid={`patient_dashboard.investigations.row.${i + 1}`}
                              >
                                <td className="py-2.5 px-3 font-medium text-gray-800">
                                  {row.name}
                                </td>
                                <td className="py-2.5 px-3 text-gray-700">
                                  {row.result}
                                </td>
                                <td className="py-2.5 px-3 text-gray-500">
                                  {row.unit || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-gray-500">
                                  {row.date || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-gray-500 max-w-[200px] truncate">
                                  {row.interpretation || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  {/* Individual investigation charts */}
                  {Object.keys(invByName).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(invByName)
                        .slice(0, 12)
                        .map(([name, { data, unit }]) => (
                          <div
                            key={name}
                            className="bg-white rounded-xl border border-purple-200 shadow-sm p-4"
                          >
                            <h4 className="font-semibold text-purple-800 mb-1 text-sm">
                              {name} Trend
                            </h4>
                            {unit && (
                              <p className="text-xs mb-2">
                                Unit:{" "}
                                <span className="font-bold text-gray-700">
                                  {unit}
                                </span>
                              </p>
                            )}
                            {data.length >= 2 ? (
                              <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={data}>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#f0f0f0"
                                  />
                                  <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 10 }}
                                    label={
                                      unit
                                        ? {
                                            value: unit,
                                            angle: -90,
                                            position: "insideLeft",
                                            style: {
                                              fontWeight: "bold",
                                              fontSize: 10,
                                            },
                                          }
                                        : undefined
                                    }
                                  />
                                  <Tooltip
                                    formatter={(v: number) => [
                                      `${v} ${unit}`,
                                      name,
                                    ]}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    name={name}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="text-center py-6 text-gray-400 text-xs">
                                Need 2+ data points for chart
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── HISTORY ── */}
                <TabsContent value="history">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-600" />
                        Visit History
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-teal-700 border-teal-300 gap-1.5"
                          onClick={downloadVisitHistoryPDF}
                          data-ocid="patient_dashboard.visits.secondary_button"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </Button>
                        {(currentRole === "doctor" ||
                          currentRole === "admin") && (
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                            onClick={() => setShowVisitForm(true)}
                            data-ocid="patient_dashboard.visits.open_modal_button"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            New Visit
                          </Button>
                        )}
                      </div>
                    </div>
                    {loadingVisits ? (
                      <div
                        className="space-y-2"
                        data-ocid="patient_dashboard.visits.loading_state"
                      >
                        {[1, 2, 3].map((k) => (
                          <Skeleton key={k} className="h-12 rounded-lg" />
                        ))}
                      </div>
                    ) : sortedVisits.length === 0 ? (
                      <div
                        className="text-center py-8"
                        data-ocid="patient_dashboard.visits.empty_state"
                      >
                        <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          No visit history yet
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              {[
                                "Date",
                                "Diagnosis",
                                "Chief Complaint",
                                "Severity",
                                "Status",
                                "Actions",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedVisits.map((visit, idx) => (
                              <tr
                                key={visit.id.toString()}
                                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedVisit(visit)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && setSelectedVisit(visit)
                                }
                                tabIndex={0}
                                data-ocid={`patient_dashboard.visits.item.${idx + 1}`}
                              >
                                <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                                  {formatTime(visit.visitDate)}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[150px] truncate">
                                  {visit.diagnosis || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 max-w-[150px] truncate">
                                  {visit.chiefComplaint || "—"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    className={`text-xs border-0 ${idx === 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                                  >
                                    {idx === 0 ? "High" : "Low"}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    className={`text-xs border-0 ${idx === 0 ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}
                                  >
                                    {idx === 0 ? "Under Treatment" : "Cured"}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVisit(visit);
                                      }}
                                      className="p-1 rounded text-teal-600 hover:bg-teal-50"
                                      data-ocid={`patient_dashboard.visits.edit_button.${idx + 1}`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                    {(currentRole === "doctor" ||
                                      currentRole === "admin") && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openRxForm(
                                            visit.diagnosis || undefined,
                                            visit.id,
                                          );
                                        }}
                                        className="p-1 rounded text-blue-600 hover:bg-blue-50"
                                        data-ocid="patient_dashboard.prescriptions.open_modal_button"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── PRESCRIPTIONS ── */}
                <TabsContent value="prescriptions">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        Prescriptions ({prescriptions.length})
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-rose-700 border-rose-300 gap-1.5"
                          onClick={downloadPrescriptionsPDF}
                          data-ocid="patient_dashboard.prescriptions.secondary_button"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </Button>
                        {(currentRole === "doctor" ||
                          currentRole === "admin") && (
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                            onClick={() => openRxForm(undefined)}
                            data-ocid="patient_dashboard.prescriptions.open_modal_button"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            New Prescription
                          </Button>
                        )}
                      </div>
                    </div>
                    {loadingRx ? (
                      <div
                        className="space-y-3"
                        data-ocid="patient_dashboard.prescriptions.loading_state"
                      >
                        {[1, 2, 3].map((k) => (
                          <Skeleton key={k} className="h-16 rounded-xl" />
                        ))}
                      </div>
                    ) : prescriptions.length === 0 ? (
                      <div
                        className="text-center py-8"
                        data-ocid="patient_dashboard.prescriptions.empty_state"
                      >
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          No prescriptions yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...prescriptions]
                          .sort((a, b) =>
                            Number(b.prescriptionDate - a.prescriptionDate),
                          )
                          .map((rx, idx) => (
                            <div
                              key={rx.id.toString()}
                              className="bg-card border border-border rounded-xl p-3 hover:shadow-sm hover:border-primary/30 transition-all"
                              data-ocid={`patient_dashboard.prescriptions.item.${idx + 1}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {rx.diagnosis ?? "Prescription"}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(rx.prescriptionDate)}
                                    <span className="ml-2">
                                      {rx.medications.length} med
                                      {rx.medications.length !== 1 ? "s" : ""}
                                    </span>
                                  </p>
                                </div>
                                {(currentRole === "doctor" ||
                                  currentRole === "admin") && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                      onClick={() => {
                                        setEditRx(rx);
                                      }}
                                      data-ocid={`patient_dashboard.prescriptions.edit_button.${idx + 1}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                      onClick={() => setSelectedRx(rx)}
                                      data-ocid={`patient_dashboard.prescriptions.secondary_button.${idx + 1}`}
                                    >
                                      <FileText className="w-3 h-3" />
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                      onClick={() => {
                                        setPadPrescription(rx);
                                        setShowPadPreview(true);
                                        loadSavedPads();
                                      }}
                                      data-ocid={`patient_dashboard.prescriptions.open_modal_button.${idx + 1}`}
                                    >
                                      <Printer className="w-3 h-3" />
                                      Pad
                                    </Button>
                                  </div>
                                )}
                                {(currentRole === "patient" ||
                                  currentRole === "staff") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0"
                                    onClick={() => setSelectedRx(rx)}
                                    data-ocid={`patient_dashboard.prescriptions.secondary_button.${idx + 1}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    View
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Saved Prescription Pads (Change 11) */}
                  {(currentRole === "patient" ||
                    currentRole === "doctor" ||
                    currentRole === "admin") &&
                    savedPads.length > 0 && (
                      <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5 mt-3">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Printer className="w-4 h-4 text-green-600" />
                          Saved Prescription Pads
                        </h3>
                        <div className="space-y-2">
                          {savedPads.map((pad, idx) => (
                            <div
                              key={pad.id}
                              className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-100"
                              data-ocid={`patient_dashboard.prescriptions.item.${idx + 1}`}
                            >
                              <div>
                                <p className="text-sm font-medium text-green-800">
                                  {pad.diagnosis || "Prescription Pad"}
                                </p>
                                <p className="text-xs text-green-600">
                                  {pad.date}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-green-300 text-green-700 hover:bg-green-50 h-7 text-xs"
                                onClick={() => {
                                  const win = window.open(
                                    "",
                                    "_blank",
                                    "width=900,height=1100",
                                  );
                                  if (win) {
                                    win.document.write(
                                      `<!DOCTYPE html><html><head><title>Prescription Pad</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse}td,th{padding:4px 8px}</style></head><body><h2>Prescription — ${pad.patientName || ""}</h2><p>Date: ${pad.date}</p><p>Diagnosis: ${pad.diagnosis || "N/A"}</p><h3>Medications:</h3><ul>${(pad.medications || []).map((m: any) => `<li><strong>${m.name}</strong> — ${m.dose || ""} ${m.frequency || ""} ${m.duration || ""}</li>`).join("")}</ul></body></html>`,
                                    );
                                    win.document.close();
                                    win.print();
                                  }
                                }}
                                data-ocid={`patient_dashboard.prescriptions.secondary_button.${idx + 1}`}
                              >
                                <Download className="w-3 h-3" />
                                Print / Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </TabsContent>

                {/* ── APPOINTMENTS ── */}
                <TabsContent value="appointments">
                  <AppointmentsTab
                    patientId={patientId}
                    currentRole={currentRole}
                  />
                </TabsContent>

                {/* ── PENDING APPROVALS ── */}
                <TabsContent value="pending">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Pending Approvals
                      {pendingCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                          {pendingCount} pending
                        </Badge>
                      )}
                    </h3>
                    {patientSubmissions.length === 0 ? (
                      <div
                        className="text-center py-8"
                        data-ocid="patient_dashboard.pending.empty_state"
                      >
                        <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          No patient submissions yet
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              {[
                                "Date / Time",
                                "Type",
                                "Submitted Data",
                                "Status",
                                "Actions",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {patientSubmissions.map((sub, idx) => (
                              <tr
                                key={sub.id}
                                className="border-b border-gray-50"
                                data-ocid={`patient_dashboard.pending.item.${idx + 1}`}
                              >
                                <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                                  {format(
                                    new Date(sub.timestamp),
                                    "MMM d, HH:mm",
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    className={`text-xs border-0 ${sub.type === "vitals" ? "bg-rose-100 text-rose-700" : sub.type === "investigation" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                                  >
                                    {sub.type}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 max-w-[250px]">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(sub.data)
                                      .filter(([, v]) => v)
                                      .slice(0, 3)
                                      .map(([k, v]) => (
                                        <span
                                          key={k}
                                          className="text-xs bg-gray-100 rounded px-1.5 py-0.5"
                                        >
                                          {k}: {v}
                                        </span>
                                      ))}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    className={`text-xs border-0 ${sub.status === "pending" ? "bg-amber-100 text-amber-700" : sub.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                  >
                                    {sub.status}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  {sub.status === "pending" &&
                                    (currentRole === "doctor" ||
                                      currentRole === "admin") && (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-emerald-700 border-emerald-300 gap-1 h-7 px-2 text-xs"
                                          onClick={() =>
                                            approveSubmission(sub.id)
                                          }
                                          data-ocid="patient_dashboard.confirm_button"
                                        >
                                          <CheckCircle2 className="w-3 h-3" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-red-700 border-red-300 gap-1 h-7 px-2 text-xs"
                                          onClick={() =>
                                            rejectSubmission(sub.id)
                                          }
                                          data-ocid="patient_dashboard.cancel_button"
                                        >
                                          <XCircle className="w-3 h-3" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── CHAT ── */}
                <TabsContent value="chat">
                  <PatientChat
                    patientId={patientId!}
                    currentRole={currentRole}
                    currentUserName={
                      currentRole === "patient"
                        ? patient.fullName || "Patient"
                        : "Dr. Arman Kabir"
                    }
                  />
                </TabsContent>

                {/* ── ACCOUNT SETTINGS (admin/doctor only) ── */}
                {(currentRole === "doctor" || currentRole === "admin") && (
                  <TabsContent value="account" className="space-y-4">
                    {/* Sign-Up Toggle */}
                    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                        <span className="text-indigo-600">🔓</span>
                        Patient Sign-Up Access
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Control whether this patient can create a portal account
                        using their register number{" "}
                        {registerNo ? (
                          <strong className="font-mono text-indigo-700">
                            ({registerNo})
                          </strong>
                        ) : null}
                        .
                      </p>
                      {registerNo ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={signUpEnabled}
                            onCheckedChange={handleToggleSignUp}
                            id="signup-toggle"
                            data-ocid="patient_dashboard.account.switch"
                          />
                          <Label
                            htmlFor="signup-toggle"
                            className="text-sm font-medium cursor-pointer select-none"
                          >
                            {signUpEnabled
                              ? "Sign-up is ✅ Enabled"
                              : "Sign-up is ❌ Disabled"}
                          </Label>
                        </div>
                      ) : (
                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          This patient has no register number assigned. Please
                          edit the patient record to assign one first.
                        </p>
                      )}
                    </div>

                    {/* Account Credentials */}
                    <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
                      <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                        <span className="text-blue-600">🔑</span>
                        Patient Account Settings
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Update the mobile number or password for the
                        patient&apos;s portal login.
                      </p>

                      {linkedAccount ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Current Account
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700 font-medium">
                              {linkedAccount.name}
                            </span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-600">
                              {linkedAccount.phone}
                            </span>
                            <span className="ml-auto">
                              {linkedAccount.status === "approved" ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                  Active
                                </span>
                              ) : linkedAccount.status === "pending" ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                  Pending
                                </span>
                              ) : (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                  Rejected
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm text-gray-500 italic">
                          No portal account found for this patient yet.
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm">New Mobile Number</Label>
                          <Input
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            value={acctNewPhone}
                            onChange={(e) => setAcctNewPhone(e.target.value)}
                            data-ocid="patient_dashboard.account.input"
                          />
                          <p className="text-xs text-gray-400">
                            Leave blank to keep current number
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">New Password</Label>
                          <Input
                            type="password"
                            placeholder="Min. 6 characters"
                            value={acctNewPassword}
                            onChange={(e) => setAcctNewPassword(e.target.value)}
                            data-ocid="patient_dashboard.account.input"
                          />
                          <p className="text-xs text-gray-400">
                            Leave blank to keep current password
                          </p>
                        </div>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
                          onClick={handleSaveAccountSettings}
                          data-ocid="patient_dashboard.account.save_button"
                        >
                          Save Account Changes
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </div>
              {/* end RIGHT CONTENT */}
            </div>
            {/* end flex row */}
          </Tabs>
        </main>
      </div>

      {/* ── Patient Submit Panel (patient role only) ── */}
      {currentRole === "patient" && (
        <>
          <button
            type="button"
            onClick={() => setShowSubmitPanel(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-full shadow-lg font-semibold text-sm transition-colors"
            data-ocid="patient_dashboard.open_modal_button"
          >
            <Plus className="w-4 h-4" />
            Update My Health
          </button>
          <Dialog open={showSubmitPanel} onOpenChange={setShowSubmitPanel}>
            <DialogContent
              className="max-w-md"
              data-ocid="patient_dashboard.modal"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  Submit Health Update
                </DialogTitle>
              </DialogHeader>
              <Tabs value={submitTab} onValueChange={setSubmitTab}>
                <TabsList className="w-full">
                  <TabsTrigger
                    value="complaint"
                    className="flex-1"
                    data-ocid="patient_dashboard.tab"
                  >
                    Symptoms
                  </TabsTrigger>
                  <TabsTrigger
                    value="vitals"
                    className="flex-1"
                    data-ocid="patient_dashboard.tab"
                  >
                    Vitals
                  </TabsTrigger>
                  <TabsTrigger
                    value="investigation"
                    className="flex-1"
                    data-ocid="patient_dashboard.tab"
                  >
                    Report
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="complaint" className="space-y-3 pt-3">
                  <Label>Describe your symptoms</Label>
                  <Textarea
                    placeholder="I have been experiencing..."
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    rows={4}
                    data-ocid="patient_dashboard.textarea"
                  />
                </TabsContent>
                <TabsContent value="vitals" className="pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["systolic", "Systolic BP"],
                        ["diastolic", "Diastolic BP"],
                        ["pulse", "Pulse (bpm)"],
                        ["temp", "Temperature (°F)"],
                        ["spo2", "SpO₂ (%)"],
                        ["weight", "Weight (kg)"],
                        ["height", "Height (cm)"],
                      ] as [string, string][]
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          placeholder="0"
                          value={vitalFields[field as keyof typeof vitalFields]}
                          onChange={(e) =>
                            setVitalFields((p) => ({
                              ...p,
                              [field]: e.target.value,
                            }))
                          }
                          data-ocid="patient_dashboard.input"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Real-time BMI calculation */}
                  {vitalFields.weight &&
                    vitalFields.height &&
                    (() => {
                      const w = Number.parseFloat(vitalFields.weight);
                      const h = Number.parseFloat(vitalFields.height);
                      if (!w || !h) return null;
                      const bmi =
                        Math.round((w / ((h / 100) * (h / 100))) * 10) / 10;
                      const cat =
                        bmi < 18.5
                          ? {
                              label: "Underweight",
                              color: "bg-blue-50 border-blue-200 text-blue-700",
                            }
                          : bmi < 25
                            ? {
                                label: "Normal",
                                color:
                                  "bg-green-50 border-green-200 text-green-700",
                              }
                            : bmi < 30
                              ? {
                                  label: "Overweight",
                                  color:
                                    "bg-amber-50 border-amber-200 text-amber-700",
                                }
                              : bmi < 35
                                ? {
                                    label: "Obese Class I",
                                    color:
                                      "bg-orange-50 border-orange-200 text-orange-700",
                                  }
                                : bmi < 40
                                  ? {
                                      label: "Obese Class II",
                                      color:
                                        "bg-red-50 border-red-200 text-red-700",
                                    }
                                  : {
                                      label: "Obese Class III",
                                      color:
                                        "bg-red-100 border-red-300 text-red-900",
                                    };
                      return (
                        <div
                          className={`mt-2 border rounded-lg p-3 flex items-center justify-between ${cat.color}`}
                        >
                          <div>
                            <p className="text-xs font-medium">
                              BMI (calculated)
                            </p>
                            <p className="text-lg font-bold">
                              {bmi}{" "}
                              <span className="text-xs font-normal">kg/m²</span>
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-white bg-opacity-60">
                            {cat.label}
                          </span>
                        </div>
                      );
                    })()}
                </TabsContent>
                <TabsContent value="investigation" className="pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Investigation Name *</Label>
                      <Input
                        placeholder="e.g. Haemoglobin"
                        value={invFields.name}
                        onChange={(e) =>
                          setInvFields((p) => ({ ...p, name: e.target.value }))
                        }
                        data-ocid="patient_dashboard.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={invFields.date}
                        onChange={(e) =>
                          setInvFields((p) => ({ ...p, date: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Result *</Label>
                      <Input
                        placeholder="e.g. 12.5"
                        value={invFields.result}
                        onChange={(e) =>
                          setInvFields((p) => ({
                            ...p,
                            result: e.target.value,
                          }))
                        }
                        data-ocid="patient_dashboard.input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input
                        placeholder="e.g. g/dL"
                        value={invFields.unit}
                        onChange={(e) =>
                          setInvFields((p) => ({ ...p, unit: e.target.value }))
                        }
                        data-ocid="patient_dashboard.input"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Upload Report (optional)</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setUploadFile(e.target.files?.[0] ?? null)
                      }
                      data-ocid="patient_dashboard.upload_button"
                    />
                  </div>
                </TabsContent>
              </Tabs>
              <Button
                className="w-full mt-2 bg-teal-600 hover:bg-teal-700"
                onClick={handleSubmitData}
                data-ocid="patient_dashboard.submit_button"
              >
                Submit for Doctor Review
              </Button>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── Dialogs ── */}
      {/* Edit Patient */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent
          className="max-w-xl max-h-[90vh] overflow-y-auto"
          data-ocid="patient_dashboard.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          <PatientForm
            patient={patient}
            onSubmit={(data) => {
              if (!patientId) return;
              updateMutation.mutate(
                { id: patientId, ...data },
                {
                  onSuccess: () => {
                    toast.success("Patient updated");
                    setShowEditForm(false);
                  },
                  onError: () => toast.error("Failed to update patient"),
                },
              );
            }}
            onCancel={() => setShowEditForm(false)}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          className="max-w-sm"
          data-ocid="patient_dashboard.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete Patient</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This will permanently delete <strong>{patient.fullName}</strong> and
            all associated records. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
              data-ocid="patient_dashboard.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!patientId) return;
                deleteMutation.mutate(patientId, {
                  onSuccess: () => {
                    toast.success("Patient deleted");
                    onBack ? onBack() : navigate({ to: "/Patients" });
                  },
                  onError: () => toast.error("Failed to delete patient"),
                });
              }}
              data-ocid="patient_dashboard.delete_button"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Visit */}
      <Dialog open={showVisitForm} onOpenChange={setShowVisitForm}>
        <DialogContent
          className="!max-w-none !w-screen !h-screen !rounded-none !top-0 !left-0 ![transform:none] p-0 flex flex-col overflow-hidden"
          data-ocid="patient_dashboard.visits.dialog"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <DialogTitle>Record Visit</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {patientId && (
                <VisitForm
                  patientId={patientId}
                  patient={patient}
                  onSubmit={(data) => {
                    createVisitMutation.mutate(data, {
                      onSuccess: () => {
                        toast.success("Visit recorded");
                        setShowVisitForm(false);
                      },
                      onError: () => toast.error("Failed to record visit"),
                    });
                  }}
                  onCancel={() => setShowVisitForm(false)}
                  isLoading={createVisitMutation.isPending}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Prescription */}
      <Dialog
        open={showRxForm}
        onOpenChange={(open) => {
          if (!open) closeRxForm();
        }}
      >
        <DialogContent
          className="p-0 overflow-hidden"
          style={{
            width: "100vw",
            maxWidth: "100vw",
            height: "100vh",
            maxHeight: "100vh",
            margin: 0,
            borderRadius: 0,
            top: 0,
            left: 0,
            transform: "none",
            position: "fixed",
          }}
          data-ocid="patient_dashboard.prescriptions.dialog"
        >
          {patientId && (
            <UpgradedPrescriptionEMR
              patientId={patientId}
              patientName={patient.fullName}
              initialDiagnosis={rxInitialDiagnosis}
              patientAge={age}
              patientGender={patient.gender}
              patientWeight={
                patient.weight ? String(patient.weight) : undefined
              }
              patientHeight={patient.height}
              patientAddress={patient.address}
              patientBloodGroup={patient.bloodGroup}
              registerNumber={(patient as any)?.registerNumber}
              visitExtendedData={rxVisitExtendedData}
              patientRegisterNumber={
                rxPatientRegisterNumber || (patient as any)?.registerNumber
              }
              onSubmit={(data) => {
                createRxMutation.mutate(data, {
                  onSuccess: () => {
                    toast.success("Prescription saved");
                    closeRxForm();
                  },
                  onError: () => toast.error("Failed to save prescription"),
                });
              }}
              onCancel={closeRxForm}
              isLoading={createRxMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Visit Detail */}
      <Dialog
        open={!!selectedVisit}
        onOpenChange={(open) => !open && setSelectedVisit(null)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="patient_dashboard.visits.panel"
        >
          <DialogHeader>
            <DialogTitle>Visit Details</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedVisit.visitType === "admitted"
                      ? "default"
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {selectedVisit.visitType}
                </Badge>
                <span className="text-muted-foreground">
                  {formatDateTime(selectedVisit.visitDate)}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Chief Complaint
                </p>
                <p className="font-medium">{selectedVisit.chiefComplaint}</p>
              </div>
              {selectedVisit.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Diagnosis
                  </p>
                  <p className="font-medium">{selectedVisit.diagnosis}</p>
                </div>
              )}
              {selectedVisit.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p>{selectedVisit.notes}</p>
                </div>
              )}
              {(currentRole === "doctor" || currentRole === "admin") && (
                <Button
                  className="w-full mt-2 bg-teal-600 hover:bg-teal-700"
                  onClick={() => {
                    setSelectedVisit(null);
                    openRxForm(
                      selectedVisit.diagnosis || undefined,
                      selectedVisit.id,
                    );
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Write Prescription
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rx detail */}
      <Dialog
        open={!!selectedRx}
        onOpenChange={(open) => !open && setSelectedRx(null)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="patient_dashboard.prescriptions.panel"
        >
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedRx && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                <p>{formatTime(selectedRx.prescriptionDate)}</p>
              </div>
              {selectedRx.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Diagnosis
                  </p>
                  <p className="font-semibold">{selectedRx.diagnosis}</p>
                </div>
              )}
              {selectedRx.medications.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Medications
                  </p>
                  <div className="space-y-2">
                    {selectedRx.medications.map((med, i) => (
                      <div
                        key={`med-${med.name}-${i}`}
                        className="bg-teal-50 border border-teal-100 rounded-lg px-3 py-2"
                      >
                        <p className="font-semibold text-teal-800">
                          {med.name}
                        </p>
                        <p className="text-xs text-teal-600">
                          {med.dose} · {med.frequency} · {med.duration}
                        </p>
                        {med.instructions && (
                          <p className="text-xs text-teal-500">
                            {med.instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRx.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Notes / Advice
                  </p>
                  <p>{selectedRx.notes}</p>
                </div>
              )}
              {(currentRole === "doctor" || currentRole === "admin") && (
                <Button
                  className="w-full mt-2"
                  variant="outline"
                  onClick={() => {
                    setSelectedRx(null);
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Prescription Pad
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Prescription Dialog (Change 8) */}
      <Dialog open={!!editRx} onOpenChange={(open) => !open && setEditRx(null)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="patient_dashboard.prescriptions.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              Edit Prescription{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (saves as new copy)
              </span>
            </DialogTitle>
          </DialogHeader>
          {editRx && patientId && (
            <PrescriptionForm
              patientId={patientId}
              patientName={patient.fullName}
              initialData={{
                prescriptionDate: editRx.prescriptionDate,
                diagnosis: editRx.diagnosis ?? null,
                medications: editRx.medications,
                notes: editRx.notes ?? null,
              }}
              onSubmit={(data) => {
                createRxMutation.mutate(data, {
                  onSuccess: () => {
                    toast.success("Edited prescription saved");
                    setEditRx(null);
                  },
                  onError: () => toast.error("Failed to save"),
                });
              }}
              onCancel={() => setEditRx(null)}
              isLoading={createRxMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Pad Dialog (Change 8 + 11) */}
      <Dialog
        open={showPadPreview}
        onOpenChange={(open) => {
          if (!open) {
            setShowPadPreview(false);
            loadSavedPads();
          }
        }}
      >
        <DialogContent
          className="!max-w-none w-[95vw] max-h-[95vh] overflow-y-auto"
          data-ocid="patient_dashboard.prescriptions.modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              Prescription Pad
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto pb-4">
            <PrescriptionPad
              prescription={padPrescription}
              patientName={patient?.fullName}
              patientAge={age ?? undefined}
              patientWeight={
                patient?.weight ? String(patient.weight) : undefined
              }
              registerNumber={(patient as any)?.registerNumber}
              patientId={patientId ?? undefined}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Pads Downloads (Change 11) — shown in downloads section */}
      {savedPads.length > 0 && showPadPreview === false && (
        <div className="hidden" data-saved-pads={JSON.stringify(savedPads)} />
      )}
    </div>
  );
}

// ── VitalsBar component ──────────────────────────────────────────────────────

function VitalsBar({
  vitals,
  weight,
  height,
}: {
  vitals: Record<string, string> | null;
  weight?: number;
  height?: number | null;
}) {
  const items = [
    {
      key: "bloodPressure",
      label: "Blood Pressure",
      value: vitals?.bloodPressure || "—",
      unit: "mmHg",
      icon: Heart,
      color: "border-red-200",
    },
    {
      key: "temperature",
      label: "Temperature",
      value: vitals?.temperature || "—",
      unit: "°F",
      icon: Thermometer,
      color: "border-orange-200",
    },
    {
      key: "pulse",
      label: "Pulse Rate",
      value: vitals?.pulse || "—",
      unit: "/min",
      icon: Activity,
      color: "border-pink-200",
    },
    {
      key: "oxygenSaturation",
      label: "SpO₂",
      value: vitals?.oxygenSaturation || "—",
      unit: "%",
      icon: Wind,
      color: "border-blue-200",
    },
    {
      key: "weight",
      label: "Weight",
      value: vitals?.weight || (weight ? String(weight) : "—"),
      unit: "kg",
      icon: User,
      color: "border-green-200",
    },
  ];
  const bmiVal = (() => {
    const w = Number.parseFloat(vitals?.weight || String(weight || "")) || null;
    const h = height || Number.parseFloat(vitals?.height || "") || null;
    if (!w || !h) return null;
    return Math.round((w / ((h / 100) * (h / 100))) * 10) / 10;
  })();
  const bmiCategory = !bmiVal
    ? null
    : bmiVal < 18.5
      ? { label: "Underweight", color: "bg-blue-100 text-blue-700" }
      : bmiVal < 25
        ? { label: "Normal", color: "bg-green-100 text-green-700" }
        : bmiVal < 30
          ? { label: "Overweight", color: "bg-amber-100 text-amber-700" }
          : bmiVal < 35
            ? { label: "Obese I", color: "bg-orange-100 text-orange-700" }
            : bmiVal < 40
              ? { label: "Obese II", color: "bg-red-100 text-red-700" }
              : { label: "Obese III", color: "bg-red-200 text-red-900" };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map(({ key, label, value, unit, icon: Icon, color }) => {
        const status = vitalStatus(key, value);
        return (
          <div
            key={key}
            className={`bg-white rounded-xl border-2 ${color} p-3 shadow-sm`}
            data-ocid="patient_dashboard.card"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Icon className="w-4 h-4 text-gray-400" />
              <Badge
                className={`text-xs border-0 ${status === "normal" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
              >
                {status === "normal"
                  ? "Normal"
                  : status === "high"
                    ? "High"
                    : "Low"}
              </Badge>
            </div>
            <p className="text-xl font-bold text-gray-800">
              {value}{" "}
              {value !== "—" ? (
                <span className="text-sm font-bold text-gray-600">{unit}</span>
              ) : null}
            </p>
            {key === "bloodPressure" &&
              value !== "—" &&
              (() => {
                const mapVal = calcMAP(value);
                return mapVal !== null ? (
                  <p className="text-xs font-bold text-green-700 mt-0.5">
                    MAP: {mapVal} mmHg
                  </p>
                ) : null;
              })()}
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        );
      })}
      {/* BMI Card */}
      <div
        className="bg-white rounded-xl border-2 border-indigo-200 p-3 shadow-sm"
        data-ocid="patient_dashboard.card"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400 font-medium">BMI</span>
          {bmiCategory ? (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${bmiCategory.color}`}
            >
              {bmiCategory.label}
            </span>
          ) : null}
        </div>
        {bmiVal ? (
          <>
            <p className="text-xl font-bold text-gray-800">
              {bmiVal}{" "}
              <span className="text-sm font-bold text-gray-600">kg/m²</span>
            </p>
            <p className="text-xs text-gray-400">Body Mass Index</p>
          </>
        ) : (
          <p className="text-xs text-gray-500 italic mt-1">
            Add height to calculate BMI
          </p>
        )}
      </div>
    </div>
  );
}

// ── AppointmentsTab ──────────────────────────────────────────────────────────

function AppointmentsTab({
  patientId,
}: { patientId: bigint | null; currentRole: string }) {
  const appointments = useMemo(() => {
    try {
      const raw = localStorage.getItem("medicare_appointments");
      if (!raw) return [];
      const all = JSON.parse(raw) as any[];
      if (!patientId) return all;
      return all.filter(
        (a) =>
          a.patientId === String(patientId) ||
          a.registerNumber === (patientId ? String(patientId) : undefined),
      );
    } catch {
      return [];
    }
  }, [patientId]);

  const upcoming = appointments
    .filter((a) => new Date(a.preferredDate || a.date) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.preferredDate || a.date).getTime() -
        new Date(b.preferredDate || b.date).getTime(),
    );

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <h3 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Next Appointment
          </h3>
          <div className="text-sm">
            <p className="font-medium text-teal-700">
              {upcoming[0].patientName || "Patient"}
            </p>
            <p className="text-teal-600">
              {upcoming[0].preferredDate || upcoming[0].date} ·{" "}
              {upcoming[0].chamber || "Chamber TBD"}
            </p>
            <Badge className="mt-1 bg-teal-100 text-teal-700 border-0 text-xs">
              {upcoming[0].status || "scheduled"}
            </Badge>
          </div>
        </div>
      )}
      {appointments.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center"
          data-ocid="patient_dashboard.appointments.empty_state"
        >
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No appointments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            All Appointments ({appointments.length})
          </h3>
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              data-ocid="patient_dashboard.appointments.table"
            >
              <thead>
                <tr className="border-b border-gray-100">
                  {["Date", "Doctor / Chamber", "Status"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt, idx) => (
                  <tr
                    key={apt.id || idx}
                    className="border-b border-gray-50"
                    data-ocid={`patient_dashboard.appointments.item.${idx + 1}`}
                  >
                    <td className="py-2.5 px-3 text-gray-600">
                      {apt.preferredDate || apt.date || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      {apt.chamber || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        className={`text-xs border-0 ${apt.status === "confirmed" ? "bg-green-100 text-green-700" : apt.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {apt.status || "pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
