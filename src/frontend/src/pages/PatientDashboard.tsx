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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  FileText,
  FlaskConical,
  Heart,
  Loader2,
  MapPin,
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
import type { Prescription, Visit } from "../backend.d";
import PatientForm from "../components/PatientForm";
import UpgradedPrescriptionEMR from "../components/UpgradedPrescriptionEMR";
import VisitForm from "../components/VisitForm";
import type { PatientAccount } from "../hooks/useEmailAuth";
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
        return {
          date: format(new Date(Number(v.visitDate / 1000000n)), "MMM d"),
          BP: systolic || null,
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
          Weight:
            Number.parseFloat(extra.weight || String(patient?.weight || "")) ||
            null,
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
    const map: Record<string, Array<{ date: string; value: number }>> = {};
    for (const row of allInvestigations) {
      if (!row.name || !row.result) continue;
      const num = Number.parseFloat(row.result);
      if (Number.isNaN(num)) continue;
      if (!map[row.name]) map[row.name] = [];
      map[row.name].push({ date: row.date || "?", value: num });
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
            <ScrollArea className="w-full">
              <TabsList className="w-full flex-nowrap overflow-x-auto justify-start h-auto p-1 gap-1 mb-4">
                <TabsTrigger
                  value="overview"
                  className="shrink-0"
                  data-ocid="patient_dashboard.tab"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="vitals"
                  className="shrink-0"
                  data-ocid="patient_dashboard.tab"
                >
                  Vitals
                </TabsTrigger>
                <TabsTrigger
                  value="investigations"
                  className="shrink-0"
                  data-ocid="patient_dashboard.tab"
                >
                  Investigations
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="shrink-0"
                  data-ocid="patient_dashboard.tab"
                >
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="prescriptions"
                  className="shrink-0"
                  data-ocid="patient_dashboard.tab"
                >
                  Prescriptions
                </TabsTrigger>
                <TabsTrigger
                  value="appointments"
                  className="shrink-0"
                  data-ocid="patient_dashboard.tab"
                >
                  Appointments
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="shrink-0 relative"
                  data-ocid="patient_dashboard.tab"
                >
                  Pending Approvals
                  {pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

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
                        ["Status", latestVisit ? "Under Treatment" : "Active"],
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
                <VitalsBar vitals={latestVitals} weight={patient.weight} />
              </div>
            </TabsContent>

            {/* ── VITALS ── */}
            <TabsContent value="vitals" className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Vital Signs Summary
                </h3>
                <VitalsBar vitals={latestVitals} weight={patient.weight} />
              </div>
              {vitalsHistory.length >= 2 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Vitals Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={vitalsHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="BP"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="BP (Systolic)"
                      />
                      <Line
                        type="monotone"
                        dataKey="Pulse"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Temp"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="SpO2"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    Need 2+ visits with vitals to show trend chart
                  </p>
                </div>
              )}
              {/* Pending patient vitals */}
              {patientSubmissions
                .filter((s) => s.type === "vitals" && s.status === "pending")
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
                    {(currentRole === "doctor" || currentRole === "admin") && (
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
                    .slice(0, 8)
                    .map(([name, data]) => (
                      <div
                        key={name}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
                      >
                        <h4 className="font-semibold text-gray-700 mb-3 text-sm">
                          {name} Trend
                        </h4>
                        {data.length >= 2 ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={data}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                              />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
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
                  {(currentRole === "doctor" || currentRole === "admin") && (
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
                  {(currentRole === "doctor" || currentRole === "admin") && (
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
                        <button
                          key={rx.id.toString()}
                          type="button"
                          onClick={() => setSelectedRx(rx)}
                          className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-sm hover:border-primary/30 transition-all"
                          data-ocid={`patient_dashboard.prescriptions.item.${idx + 1}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {rx.diagnosis ?? "Prescription"}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(rx.prescriptionDate)}
                                </span>
                                <span>
                                  {rx.medications.length} medication
                                  {rx.medications.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
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
                              {format(new Date(sub.timestamp), "MMM d, HH:mm")}
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
                                      onClick={() => approveSubmission(sub.id)}
                                      data-ocid="patient_dashboard.confirm_button"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-700 border-red-300 gap-1 h-7 px-2 text-xs"
                                      onClick={() => rejectSubmission(sub.id)}
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
    </div>
  );
}

// ── VitalsBar component ──────────────────────────────────────────────────────

function VitalsBar({
  vitals,
  weight,
}: { vitals: Record<string, string> | null; weight?: number }) {
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
            <p className="text-xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400">
              {label} {value !== "—" ? unit : ""}
            </p>
          </div>
        );
      })}
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
