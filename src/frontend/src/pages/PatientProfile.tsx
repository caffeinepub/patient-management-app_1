import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Droplets,
  Edit,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  PlusCircle,
  Printer,
  Scissors,
  Search,
  Settings,
  Stethoscope,
  Thermometer,
  User,
  Users,
  Wind,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Prescription, Visit } from "../backend.d";
import NewPrescriptionMode from "../components/NewPrescriptionMode";
import PatientForm from "../components/PatientForm";
import PrescriptionForm from "../components/PrescriptionForm";
import PrescriptionPad from "../components/PrescriptionPad";
import UpgradedPrescriptionEMR from "../components/UpgradedPrescriptionEMR";
import VisitForm from "../components/VisitForm";
import {
  getDoctorEmail,
  useCreatePrescription,
  useCreateVisit,
  useGetPatient,
  useGetPrescriptionsByPatient,
  useGetVisitsByPatient,
  useUpdatePatient,
} from "../hooks/useQueries";

const RX_SKELETON_KEYS = ["rsk1", "rsk2", "rsk3"];

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

function PrescriptionCard({
  rx,
  index,
  onClick,
}: {
  rx: Prescription;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-card hover:border-primary/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-ocid={`patient_profile.prescriptions.item.${index + 1}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-secondary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
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
  );
}

export default function PatientProfile() {
  const search = useSearch({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const patientId = search.id ? BigInt(search.id) : null;

  const [showEditForm, setShowEditForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [newVisitTemplate, setNewVisitTemplate] = useState<Visit | null>(null);
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
  const [editRx, setEditRx] = useState<Prescription | null>(null);
  const [invSearch, setInvSearch] = useState("");
  const [showPadPreview, setShowPadPreview] = useState(false);
  const [padPrescription, setPadPrescription] = useState<Prescription | null>(
    null,
  );

  const { data: patient, isLoading: loadingPatient } = useGetPatient(patientId);
  const { data: visits = [], isLoading: _loadingVisits } =
    useGetVisitsByPatient(patientId);
  const { data: prescriptions = [], isLoading: loadingRx } =
    useGetPrescriptionsByPatient(patientId);

  const updateMutation = useUpdatePatient();
  const createVisitMutation = useCreateVisit();
  const createRxMutation = useCreatePrescription();

  const openRxForm = (diagnosis?: string, forVisitId?: bigint) => {
    setRxInitialDiagnosis(diagnosis);
    // Load visit extended data from localStorage
    try {
      const doctorEmail = getDoctorEmail();
      const targetVisitId =
        forVisitId ??
        (visits.length > 0
          ? [...visits].sort((a, b) => Number(b.visitDate - a.visitDate))[0]?.id
          : undefined);
      if (targetVisitId !== undefined) {
        const keys = Object.keys(localStorage).filter(
          (k) =>
            k.startsWith(`visit_form_data_${targetVisitId}_`) ||
            k === `visit_form_data_${targetVisitId}_${doctorEmail}`,
        );
        if (keys.length > 0) {
          const raw = localStorage.getItem(keys[0]);
          if (raw) setRxVisitExtendedData(JSON.parse(raw));
        }
      }
      // Load register number
      if (patientId) {
        const regRaw = localStorage.getItem(`patient_register_${patientId}`);
        if (regRaw) setRxPatientRegisterNumber(regRaw);
      }
    } catch {
      /* ignore */
    }
    setShowRxForm(true);
  };

  const closeRxForm = () => {
    setShowRxForm(false);
    setRxInitialDiagnosis(undefined);
  };

  const openPadPreview = (rx: Prescription) => {
    setPadPrescription(rx);
    setSelectedRx(null);
    setShowPadPreview(true);
  };

  if (loadingPatient) {
    return (
      <div
        className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4"
        data-ocid="patient_profile.loading_state"
      >
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div
          className="text-center py-20"
          data-ocid="patient_profile.error_state"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-2">Patient not found</p>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/Patients" })}
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

  // Get doctor info from localStorage for sidebar
  function getDoctorSidebarInfo() {
    try {
      const data = localStorage.getItem("medicare_doctors_data");
      if (data) {
        const parsed = JSON.parse(data);
        const doc = parsed.drArman || Object.values(parsed)[0] || null;
        if (doc)
          return doc as {
            name?: string;
            specialty?: string;
            degree?: string;
            photo?: string;
          };
      }
    } catch {
      /* ignore */
    }
    const loggedIn = localStorage.getItem("medicare_logged_in_doctor");
    if (loggedIn) {
      try {
        return JSON.parse(loggedIn) as {
          name?: string;
          specialty?: string;
          degree?: string;
          photo?: string;
        };
      } catch {
        /* ignore */
      }
    }
    return null;
  }
  const doctorInfo = getDoctorSidebarInfo();

  // Get latest visit vitals
  const latestVisit =
    visits.length > 0
      ? [...visits].sort((a, b) => Number(b.visitDate - a.visitDate))[0]
      : null;

  function getLatestVitals() {
    if (!latestVisit) return null;
    try {
      const doctorEmail = getDoctorEmail();
      const key = `visit_form_data_${latestVisit.id}_${doctorEmail}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.vitalSigns as {
          bloodPressure?: string;
          pulse?: string;
          temperature?: string;
          oxygenSaturation?: string;
          weight?: string;
        } | null;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
  const vitals = getLatestVitals();

  // Get investigation rows
  function getInvestigationRows(): Array<{
    date: string;
    name: string;
    result: string;
    unit?: string;
    interpretation?: string;
  }> {
    if (!latestVisit) return [];
    try {
      const doctorEmail = getDoctorEmail();
      const key = `visit_form_data_${latestVisit.id}_${doctorEmail}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return (
          (parsed.previous_investigation_rows as Array<{
            date: string;
            name: string;
            result: string;
            unit?: string;
            interpretation?: string;
          }>) || []
        );
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  const DEFAULT_INVESTIGATIONS = [
    "Haemoglobin",
    "WBC Count",
    "Serum Creatinine",
    "Blood Glucose",
  ];
  const allInvRows = getInvestigationRows();
  const displayedRows = invSearch
    ? allInvRows.filter((r) =>
        r.name.toLowerCase().includes(invSearch.toLowerCase()),
      )
    : allInvRows.length > 0
      ? allInvRows
      : DEFAULT_INVESTIGATIONS.map((n) => ({
          date: "",
          name: n,
          result: "—",
          unit: "",
          interpretation: "",
        }));

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

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/Dashboard" },
    { label: "Patients", icon: Users, path: "/Patients" },
    { label: "Visits", icon: Stethoscope, path: "/Visits" },
    { label: "Prescriptions", icon: FileText, path: "/Prescriptions" },
    { label: "Appointments", icon: Calendar, path: "/Appointments" },
    { label: "Settings", icon: Settings, path: "/Settings" },
  ];

  return (
    <div
      className="flex min-h-screen bg-gray-50"
      data-ocid="patient_profile.page"
    >
      {/* LEFT SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 sticky top-0 h-screen shadow-sm flex-shrink-0">
        {/* Doctor Profile */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {doctorInfo?.name ? doctorInfo.name.charAt(0).toUpperCase() : "D"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {doctorInfo?.name || "Dr. Arman Kabir"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {doctorInfo?.specialty || "General Medicine"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate({ to: item.path as "/" })}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.path === "/Patients"
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              data-ocid="patient_profile.nav.link"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* TOP HEADER */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            {/* Breadcrumb */}
            <nav
              className="flex items-center gap-1.5 text-sm"
              data-ocid="patient_profile.panel"
            >
              <button
                type="button"
                onClick={() => navigate({ to: "/Patients" })}
                className="text-gray-500 hover:text-teal-600 transition-colors font-medium"
                data-ocid="patient_profile.link"
              >
                Patient
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                type="button"
                onClick={() => navigate({ to: "/Patients" })}
                className="text-gray-500 hover:text-teal-600 transition-colors"
              >
                Patient Details
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-semibold truncate max-w-[200px]">
                {patient.fullName}
              </span>
            </nav>
            {/* Header icons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                data-ocid="patient_profile.secondary_button"
              >
                <Bell className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                data-ocid="patient_profile.search_input"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* PATIENT PROFILE CARD */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6"
            data-ocid="patient_profile.card"
          >
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div
                className="w-18 h-18 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-bold text-white shadow"
                style={{
                  width: 72,
                  height: 72,
                  background: "linear-gradient(135deg, #0d9488, #0891b2)",
                }}
              >
                {patient.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Name + email + button */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {patient.fullName}
                    </h1>
                    {patient.nameBn && (
                      <p className="text-sm text-gray-500">{patient.nameBn}</p>
                    )}
                    {patient.email && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5" /> {patient.email}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditForm(true)}
                    className="flex-shrink-0 gap-1.5 text-sm"
                    data-ocid="patient_profile.edit_button"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                  {[
                    {
                      label: "Sex",
                      value: patient.gender || "—",
                      color: "bg-blue-50 text-blue-700",
                    },
                    {
                      label: "Age",
                      value: age !== null ? `${age} yrs` : "—",
                      color: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      label: "Blood Group",
                      value:
                        patient.bloodGroup && patient.bloodGroup !== "unknown"
                          ? patient.bloodGroup
                          : "—",
                      color: "bg-red-50 text-red-700",
                    },
                    {
                      label: "Status",
                      value: patient.patientType || "OPD",
                      color: "bg-purple-50 text-purple-700",
                    },
                    {
                      label: "Department",
                      value: "General",
                      color: "bg-amber-50 text-amber-700",
                    },
                    {
                      label: "Registered",
                      value: patient.createdAt
                        ? format(
                            new Date(Number(patient.createdAt / 1000000n)),
                            "d MMM yyyy",
                          )
                        : "—",
                      color: "bg-gray-50 text-gray-600",
                    },
                    {
                      label: "Appointments",
                      value: String(visits.length),
                      color: "bg-teal-50 text-teal-700",
                    },
                    {
                      label: "Reg No",
                      value:
                        (patient as unknown as { registerNumber?: string })
                          .registerNumber || "—",
                      color: "bg-indigo-50 text-indigo-700",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className={`rounded-lg px-3 py-2 ${color}`}
                    >
                      <p className="text-xs font-medium opacity-70">{label}</p>
                      <p className="text-sm font-semibold mt-0.5 capitalize">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Alerts row */}
                {(patient.allergies.length > 0 ||
                  patient.chronicConditions.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {patient.allergies.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-700 font-medium">
                          Allergies: {patient.allergies.join(", ")}
                        </span>
                      </div>
                    )}
                    {patient.chronicConditions.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                        <Heart className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-xs text-amber-700 font-medium">
                          {patient.chronicConditions.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* CURRENT VITALS */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Current Vitals
              {latestVisit && (
                <span className="text-xs font-normal text-gray-400">
                  (from latest visit)
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
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
                  value:
                    vitals?.weight ||
                    (patient.weight ? String(patient.weight) : "—"),
                  unit: "kg",
                  icon: User,
                  color: "border-green-200",
                },
              ].map(({ key, label, value, unit, icon: Icon, color }) => {
                const status = vitalStatus(key, value);
                return (
                  <div
                    key={key}
                    className={`bg-white rounded-xl border-2 ${color} p-3 shadow-sm`}
                    data-ocid="patient_profile.card"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <Badge
                        className={`text-xs ${
                          status === "normal"
                            ? "bg-green-100 text-green-700 border-0"
                            : "bg-red-100 text-red-700 border-0"
                        }`}
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
          </div>

          {/* CURRENT INVESTIGATION PROFILE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Current Investigation Profile
              </h2>
              <div className="relative w-52">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search investigation..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  data-ocid="patient_profile.search_input"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                data-ocid="patient_profile.table"
              >
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Investigation
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Result
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Unit
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Interpretation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-sm text-gray-400"
                        data-ocid="patient_profile.empty_state"
                      >
                        No investigation reports found
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row, i) => (
                      <tr
                        key={`inv-${row.name}-${i}`}
                        className="border-b border-gray-50 hover:bg-gray-50"
                        data-ocid={`patient_profile.investigations.row.${i + 1}`}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PATIENT HISTORY TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                Patient History
              </h2>
              <Button
                size="sm"
                onClick={() => setShowVisitForm(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-sm"
                data-ocid="patient_profile.visits.open_modal_button"
              >
                <Plus className="w-3.5 h-3.5" /> New Visit
              </Button>
            </div>
            {visits.length === 0 ? (
              <div
                className="text-center py-8"
                data-ocid="patient_profile.visits.empty_state"
              >
                <Stethoscope className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No visit history yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm"
                  data-ocid="patient_profile.visits.table"
                >
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
                    {visits
                      .slice()
                      .sort((a, b) => Number(b.visitDate - a.visitDate))
                      .map((visit, idx) => {
                        const isRecent = idx === 0;
                        return (
                          <tr
                            key={visit.id.toString()}
                            className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedVisit(visit)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && setSelectedVisit(visit)
                            }
                            tabIndex={0}
                            data-ocid={`patient_profile.visits.item.${idx + 1}`}
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
                                className={`text-xs border-0 ${isRecent ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                              >
                                {isRecent ? "High" : "Low"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                className={`text-xs border-0 ${isRecent ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}
                              >
                                {isRecent ? "Under Treatment" : "Cured"}
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
                                  className="p-1 rounded text-teal-600 hover:bg-teal-50 transition-colors"
                                  data-ocid={`patient_profile.visits.edit_button.${idx + 1}`}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRxForm(
                                      visit.diagnosis || undefined,
                                      visit.id,
                                    );
                                  }}
                                  className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                  data-ocid="patient_profile.prescriptions.open_modal_button"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PRESCRIPTIONS SECTION */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Prescriptions ({prescriptions.length})
              </h2>
              <Button
                size="sm"
                onClick={() => openRxForm(undefined)}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-sm"
                data-ocid="patient_profile.prescriptions.open_modal_button"
              >
                <Plus className="w-3.5 h-3.5" /> New Prescription
              </Button>
            </div>
            {loadingRx ? (
              <div
                className="space-y-3"
                data-ocid="patient_profile.prescriptions.loading_state"
              >
                {RX_SKELETON_KEYS.map((k) => (
                  <Skeleton key={k} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <div
                className="text-center py-8"
                data-ocid="patient_profile.prescriptions.empty_state"
              >
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No prescriptions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prescriptions
                  .slice()
                  .sort((a, b) =>
                    Number(b.prescriptionDate - a.prescriptionDate),
                  )
                  .map((rx, idx) => (
                    <PrescriptionCard
                      key={rx.id.toString()}
                      rx={rx}
                      index={idx}
                      onClick={() => setSelectedRx(rx)}
                    />
                  ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Patient Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent
          className="max-w-xl max-h-[90vh] overflow-y-auto"
          data-ocid="patient_profile.dialog"
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

      {/* New Visit Dialog */}
      <Dialog open={showVisitForm} onOpenChange={setShowVisitForm}>
        <DialogContent
          className="!max-w-none !w-screen !h-screen !rounded-none !top-0 !left-0 ![transform:none] p-0 flex flex-col overflow-hidden"
          data-ocid="patient_profile.visits.dialog"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <DialogTitle>
                {newVisitTemplate
                  ? "Add New Visit / Investigation Update"
                  : "Record Visit"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {patientId && (
                <VisitForm
                  patientId={patientId}
                  patient={patient}
                  visit={
                    newVisitTemplate
                      ? {
                          visit_type: newVisitTemplate.visitType,
                          chief_complaint:
                            newVisitTemplate.chiefComplaint ?? "",
                          diagnosis: newVisitTemplate.diagnosis ?? "",
                        }
                      : undefined
                  }
                  onSubmit={(data) => {
                    createVisitMutation.mutate(data, {
                      onSuccess: () => {
                        toast.success(
                          newVisitTemplate
                            ? "New follow-up visit recorded"
                            : "Visit recorded",
                        );
                        setShowVisitForm(false);
                        setNewVisitTemplate(null);
                      },
                      onError: () => toast.error("Failed to record visit"),
                    });
                  }}
                  onCancel={() => {
                    setShowVisitForm(false);
                    setNewVisitTemplate(null);
                  }}
                  isLoading={createVisitMutation.isPending}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Prescription Dialog - Split Screen Mode */}
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
          data-ocid="patient_profile.prescriptions.dialog"
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

      {/* Visit Detail Dialog */}
      <Dialog
        open={!!selectedVisit}
        onOpenChange={(open) => !open && setSelectedVisit(null)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="patient_profile.visits.panel"
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
              {selectedVisit.historyOfPresentIllness && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    History of Present Illness
                  </p>
                  <p>{selectedVisit.historyOfPresentIllness}</p>
                </div>
              )}
              {(selectedVisit.vitalSigns.bloodPressure ||
                selectedVisit.vitalSigns.pulse ||
                selectedVisit.vitalSigns.temperature ||
                selectedVisit.vitalSigns.respiratoryRate ||
                selectedVisit.vitalSigns.oxygenSaturation) && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Vital Signs
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedVisit.vitalSigns.bloodPressure && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground">BP</p>
                        <p className="font-medium">
                          {selectedVisit.vitalSigns.bloodPressure}
                        </p>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.pulse && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground">Pulse</p>
                        <p className="font-medium">
                          {selectedVisit.vitalSigns.pulse} bpm
                        </p>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.temperature && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground">Temp</p>
                        <p className="font-medium">
                          {selectedVisit.vitalSigns.temperature}°F
                        </p>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.respiratoryRate && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground">RR</p>
                        <p className="font-medium">
                          {selectedVisit.vitalSigns.respiratoryRate}/min
                        </p>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.oxygenSaturation && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground">SpO2</p>
                        <p className="font-medium">
                          {selectedVisit.vitalSigns.oxygenSaturation}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedVisit.physicalExamination && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Physical Examination
                  </p>
                  <p>{selectedVisit.physicalExamination}</p>
                </div>
              )}
              {selectedVisit.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Diagnosis
                  </p>
                  <p className="font-semibold text-primary">
                    {selectedVisit.diagnosis}
                  </p>
                </div>
              )}
              {selectedVisit.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p>{selectedVisit.notes}</p>
                </div>
              )}
              <div className="pt-2">
                <Button
                  onClick={() => {
                    const dx = selectedVisit.diagnosis ?? undefined;
                    setSelectedVisit(null);
                    openRxForm(dx);
                  }}
                  variant="outline"
                  className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50"
                  data-ocid="patient_profile.visits.secondary_button"
                >
                  <FileText className="w-4 h-4" />
                  Write Prescription
                  {selectedVisit.diagnosis && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-teal-300 text-teal-600 ml-1"
                    >
                      DIMS
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Detail Dialog */}
      <Dialog
        open={!!selectedRx}
        onOpenChange={(open) => !open && setSelectedRx(null)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="patient_profile.prescriptions.panel"
        >
          <DialogHeader>
            <DialogTitle>Prescription</DialogTitle>
          </DialogHeader>
          {selectedRx && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedRx.prescriptionDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditRx(selectedRx);
                      setSelectedRx(null);
                    }}
                    className="gap-2 h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                    data-ocid="patient_profile.prescriptions.edit_button"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPadPreview(selectedRx)}
                    className="gap-2 h-8 border-blue-300 text-blue-700 hover:bg-blue-50"
                    data-ocid="patient_profile.prescriptions.secondary_button"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Pad
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-2 h-8 border-teal-300 text-teal-700 hover:bg-teal-50"
                    data-ocid="patient_profile.prescriptions.secondary_button"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Button>
                </div>
              </div>
              {selectedRx.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Diagnosis
                  </p>
                  <p className="font-semibold text-primary">
                    {selectedRx.diagnosis}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Medications
                </p>
                <div className="space-y-2">
                  {selectedRx.medications.map((med, i) => (
                    <div
                      key={`${med.name}-${i}`}
                      className="bg-muted/40 rounded-lg p-3"
                    >
                      <p className="font-semibold">{med.name}</p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {med.dose && <p>Dose: {med.dose}</p>}
                        {med.frequency && <p>Frequency: {med.frequency}</p>}
                        {med.duration && <p>Duration: {med.duration}</p>}
                        {med.instructions && (
                          <p>Instructions: {med.instructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRx.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p>{selectedRx.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Prescription Dialog */}
      <Dialog
        open={!!editRx}
        onOpenChange={(open) => {
          if (!open) setEditRx(null);
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="patient_profile.prescriptions.edit_modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Prescription
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
                    toast.success("Edited prescription saved as new copy");
                    setEditRx(null);
                  },
                  onError: () => toast.error("Failed to save prescription"),
                });
              }}
              onCancel={() => setEditRx(null)}
              isLoading={createRxMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Pad Preview Dialog */}
      <Dialog
        open={showPadPreview}
        onOpenChange={(open) => !open && setShowPadPreview(false)}
      >
        <DialogContent
          className="!max-w-none w-[95vw] max-h-[95vh] overflow-y-auto"
          data-ocid="patient_profile.prescriptions.modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              Prescription Pad — Print Preview
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto pb-4">
            <PrescriptionPad
              prescription={padPrescription}
              patientName={patient.fullName}
              patientAge={age ?? undefined}
              patientWeight={
                patient?.weight ? String(patient.weight) : undefined
              }
              registerNumber={(patient as any)?.registerNumber}
              linkedVisitId={
                padPrescription?.visitId !== undefined &&
                padPrescription?.visitId !== null
                  ? String(padPrescription.visitId)
                  : undefined
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
