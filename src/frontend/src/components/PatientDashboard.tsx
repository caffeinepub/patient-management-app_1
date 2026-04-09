/**
 * PatientDashboard — inner tabbed dashboard component
 * Renders the 9 colored navigation tabs and their content.
 * Used by pages/PatientDashboard.tsx after patient data is loaded.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  Baby,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Lightbulb,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Search,
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
import {
  isSignUpEnabled,
  loadPatientRegistry,
  setSignUpEnabled,
  useEmailAuth,
} from "../hooks/useEmailAuth";
import type { PatientAccount } from "../hooks/useEmailAuth";
import { getVisitFormData } from "../hooks/useQueries";
import type { Patient, Prescription, Visit } from "../types";
import PatientChat from "./PatientChat";
import type {
  AdviceEntry,
  ComplaintEntry,
  DrugReminder,
  PatientSubmission,
} from "./patientDashboardTypes";
import {
  loadAdviceEntries,
  loadComplaints,
  loadSubmissions,
  saveAdviceEntries,
  saveComplaints,
  saveSubmissions,
} from "./patientDashboardTypes";

function formatTime(time: bigint): string {
  return format(new Date(Number(time / 1000000n)), "MMM d, yyyy");
}

function calcMAP(bp: string): number | null {
  const parts = bp.split("/");
  if (parts.length !== 2) return null;
  const sbp = Number.parseInt(parts[0]);
  const dbp = Number.parseInt(parts[1]);
  if (Number.isNaN(sbp) || Number.isNaN(dbp)) return null;
  return Math.round(dbp + (sbp - dbp) / 3);
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

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5)
    return { label: "Underweight", color: "text-blue-600 bg-blue-100" };
  if (bmi < 25)
    return { label: "Normal", color: "text-green-700 bg-green-100" };
  if (bmi < 30)
    return { label: "Overweight", color: "text-amber-700 bg-amber-100" };
  if (bmi < 35)
    return { label: "Obese I", color: "text-orange-700 bg-orange-100" };
  return { label: "Obese II+", color: "text-red-700 bg-red-100" };
}

// ── VitalsBar ─────────────────────────────────────────────────────────────────
function VitalsBar({
  vitals,
  weight,
  height,
}: {
  vitals: Record<string, string> | null;
  weight?: number;
  height?: number;
}) {
  const bp = vitals?.bloodPressure || "";
  const map = bp ? calcMAP(bp) : null;
  const wt = vitals?.weight ? Number.parseFloat(vitals.weight) : weight;
  const ht = vitals?.height ? Number.parseFloat(vitals.height) : height;
  const bmi =
    wt && ht ? Math.round((wt / ((ht / 100) * (ht / 100))) * 10) / 10 : null;
  const bmiCat = bmi ? getBMICategory(bmi) : null;

  const items = [
    {
      key: "bloodPressure",
      label: "BP",
      value: bp || "—",
      unit: "mmHg",
      extra: map ? ` | MAP: ${map}` : "",
    },
    {
      key: "pulse",
      label: "Pulse",
      value: vitals?.pulse || "—",
      unit: "beats/min",
    },
    {
      key: "oxygenSaturation",
      label: "SpO₂",
      value: vitals?.oxygenSaturation || "—",
      unit: "%",
    },
    {
      key: "temperature",
      label: "Temp",
      value: vitals?.temperature || "—",
      unit: "°C",
    },
    {
      key: "weight",
      label: "Weight",
      value: wt ? String(wt) : "—",
      unit: "kg",
    },
    {
      key: "respiratoryRate",
      label: "RR",
      value: vitals?.respiratoryRate || "—",
      unit: "breaths/min",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const status =
            item.value !== "—" ? vitalStatus(item.key, item.value) : "normal";
          return (
            <div
              key={item.key}
              className={`rounded-xl p-3 border ${
                status === "high"
                  ? "bg-red-50 border-red-200"
                  : status === "low"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
              }`}
            >
              <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
              <p
                className={`font-bold text-lg ${status === "high" ? "text-red-700" : status === "low" ? "text-blue-700" : "text-gray-800"}`}
              >
                {item.value}
              </p>
              <p className="text-xs font-bold text-gray-500">
                {item.unit}
                {item.extra && (
                  <span className="font-normal">{item.extra}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      {bmi && bmiCat && (
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div>
            <p className="text-xs text-gray-500">BMI</p>
            <p className="font-bold text-lg text-gray-800">{bmi}</p>
            <p className="text-xs font-bold text-gray-500">kg/m²</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${bmiCat.color}`}
          >
            {bmiCat.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ── VitalGraph ────────────────────────────────────────────────────────────────
function VitalGraph({
  title,
  data,
  dataKey,
  unit,
  color,
  bgClass,
  borderClass,
  icon: Icon,
}: {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string | string[];
  unit: string;
  color: string | string[];
  bgClass: string;
  borderClass: string;
  icon: React.ElementType;
}) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  const colors = Array.isArray(color) ? color : [color];
  const hasData = data.filter((r) => keys.some((k) => r[k])).length >= 2;

  return (
    <div
      className={`${bgClass} rounded-xl border ${borderClass} shadow-sm p-4`}
    >
      <h4 className="font-semibold mb-3 text-sm flex items-center gap-1.5">
        <Icon className="w-4 h-4" />
        {title}
        <span className="text-xs font-normal ml-1 opacity-60">({unit})</span>
      </h4>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              label={{
                value: unit,
                angle: -90,
                position: "insideLeft",
                style: { fontWeight: "bold", fontSize: 10 },
              }}
            />
            <Tooltip />
            {keys.length > 1 && <Legend />}
            {keys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={colors[i] || colors[0]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={k}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Activity className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <p className="text-xs">Need 2+ visits for trend</p>
        </div>
      )}
    </div>
  );
}

// ── AppointmentsTab ───────────────────────────────────────────────────────────
const APPOINTMENTS_KEY = "medicare_appointments";

function AppointmentsTab({
  patientId,
  currentRole,
  patientName,
}: {
  patientId: bigint | null;
  currentRole: string;
  patientName: string;
}) {
  const allAppts = useMemo(() => {
    try {
      const raw = localStorage.getItem(APPOINTMENTS_KEY);
      if (!raw) return [];
      const all = JSON.parse(raw) as Array<{
        id: string;
        patientName: string;
        preferredDate: string;
        preferredTime: string;
        preferredDoctor: string;
        status: string;
        reason?: string;
        createdAt: string;
        patientId?: string;
      }>;
      if (!patientId) return all;
      return all.filter(
        (a) =>
          a.patientId === String(patientId) ||
          a.patientName?.toLowerCase() === patientName.toLowerCase(),
      );
    } catch {
      return [];
    }
  }, [patientId, patientName]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    preferredDate: "",
    preferredTime: "",
    preferredDoctor: "",
    reason: "",
  });

  const upcoming = allAppts.filter(
    (a) => a.status !== "cancelled" && new Date(a.preferredDate) >= new Date(),
  );
  const past = allAppts.filter(
    (a) => a.status === "cancelled" || new Date(a.preferredDate) < new Date(),
  );

  function createAppointment() {
    if (!form.preferredDate || !form.preferredTime) {
      toast.error("Please set date and time");
      return;
    }
    try {
      const raw = localStorage.getItem(APPOINTMENTS_KEY);
      const all = raw ? JSON.parse(raw) : [];
      all.push({
        id: Date.now().toString(36),
        patientId: String(patientId),
        patientName,
        phone: "",
        preferredDoctor: form.preferredDoctor || "Dr. Arman Kabir",
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime,
        reason: form.reason,
        status: "pending",
        createdAt: new Date().toISOString(),
        createdBy: currentRole,
      });
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
      toast.success("Appointment created");
      setShowForm(false);
      setForm({
        preferredDate: "",
        preferredTime: "",
        preferredDoctor: "",
        reason: "",
      });
    } catch {
      toast.error("Failed to create appointment");
    }
  }

  return (
    <div className="space-y-4">
      {(currentRole === "doctor" ||
        currentRole === "admin" ||
        currentRole === "staff" ||
        currentRole === "patient") && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            onClick={() => setShowForm(!showForm)}
            data-ocid="patient_dashboard.appointments.open_modal_button"
          >
            <Plus className="w-3.5 h-3.5" />
            New Appointment
          </Button>
        </div>
      )}

      {showForm && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-green-800 text-sm">
            Book Appointment
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Preferred Date *</Label>
              <input
                type="date"
                value={form.preferredDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preferredDate: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1"
                data-ocid="patient_dashboard.appointments.input"
              />
            </div>
            <div>
              <Label className="text-xs">Preferred Time *</Label>
              <input
                type="time"
                value={form.preferredTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preferredTime: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1"
                data-ocid="patient_dashboard.appointments.input"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Doctor</Label>
            <Input
              value={form.preferredDoctor}
              onChange={(e) =>
                setForm((f) => ({ ...f, preferredDoctor: e.target.value }))
              }
              placeholder="Dr. Arman Kabir"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Reason (optional)</Label>
            <Input
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              placeholder="Follow-up, new complaint..."
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={createAppointment}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Save Appointment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Upcoming Appointments
          </h3>
          <div className="space-y-2">
            {upcoming.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5 border border-green-100"
                data-ocid={`patient_dashboard.appointments.item.${i + 1}`}
              >
                <div>
                  <p className="font-medium text-sm text-green-800">
                    {a.preferredDate} — {a.preferredTime}
                  </p>
                  <p className="text-xs text-green-600">{a.preferredDoctor}</p>
                  {a.reason && (
                    <p className="text-xs text-gray-500">{a.reason}</p>
                  )}
                </div>
                <Badge
                  className={`text-xs border-0 ${a.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Past Appointments
          </h3>
          <div className="space-y-2">
            {past.slice(0, 5).map((a, i) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100"
                data-ocid={`patient_dashboard.appointments.item.${i + 1}`}
              >
                <div>
                  <p className="font-medium text-sm text-gray-700">
                    {a.preferredDate} — {a.preferredTime}
                  </p>
                  <p className="text-xs text-gray-500">{a.preferredDoctor}</p>
                </div>
                <Badge className="text-xs border-0 bg-gray-100 text-gray-600">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {allAppts.length === 0 && (
        <div
          className="text-center py-10 bg-white rounded-xl border border-gray-200"
          data-ocid="patient_dashboard.appointments.empty_state"
        >
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No appointments yet</p>
        </div>
      )}
    </div>
  );
}

// ── HistoryTabContent ─────────────────────────────────────────────────────────
function HistoryTabContent({
  sortedVisits,
  currentRole,
  setSelectedVisit,
  downloadSingleVisitPDF,
  openRxForm,
}: {
  sortedVisits: Visit[];
  currentRole: string;
  setSelectedVisit: (v: Visit | null) => void;
  downloadSingleVisitPDF: (v: Visit) => void;
  openRxForm: (diagnosis?: string, visitId?: bigint) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sortedVisits.length === 0) {
    return (
      <p
        className="text-sm text-gray-400 text-center py-8"
        data-ocid="patient_dashboard.visits.empty_state"
      >
        No visit history yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sortedVisits.map((v, idx) => {
        const isExpanded = expandedId === v.id.toString();
        let extData: Record<string, unknown> = {};
        try {
          const fd = getVisitFormData(v.id);
          if (fd) extData = fd;
        } catch {}
        const showToPatient = extData.showToPatient !== false;
        const diagnosis = (extData.diagnosis as string) || v.diagnosis || "—";

        return (
          <div
            key={v.id.toString()}
            className="border border-gray-200 rounded-xl overflow-hidden"
            data-ocid={`patient_dashboard.visits.item.${idx + 1}`}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : v.id.toString())}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-800">
                    {diagnosis}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatTime(v.visitDate)} · {v.visitType || "outpatient"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(currentRole === "doctor" || currentRole === "admin") && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVisit(v);
                      }}
                      data-ocid={`patient_dashboard.visits.secondary_button.${idx + 1}`}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-teal-300 text-teal-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRxForm(diagnosis, v.id);
                      }}
                      data-ocid={`patient_dashboard.visits.open_modal_button.${idx + 1}`}
                    >
                      <Pencil className="w-3 h-3" />
                      Rx
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-purple-300 text-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSingleVisitPDF(v);
                      }}
                      data-ocid={`patient_dashboard.visits.button.${idx + 1}`}
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant={showToPatient ? "default" : "outline"}
                      className={`h-7 px-2 text-xs ${showToPatient ? "bg-green-600 text-white" : "border-gray-300 text-gray-600"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const stored = getVisitFormData(v.id) || {};
                        stored.showToPatient = !showToPatient;
                        localStorage.setItem(
                          `visit_form_data_${v.id}_${(localStorage.getItem("staff_auth") ? JSON.parse(localStorage.getItem("staff_auth") || "{}").email : null) || "default"}`,
                          JSON.stringify(stored),
                        );
                        toast.success(
                          showToPatient
                            ? "Hidden from patient"
                            : "Shown to patient",
                        );
                      }}
                    >
                      {showToPatient ? "Visible" : "Hidden"}
                    </Button>
                  </>
                )}
                {currentRole === "patient" && showToPatient && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 border-purple-300 text-purple-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleVisitPDF(v);
                    }}
                  >
                    <Download className="w-3 h-3" />
                    PDF
                  </Button>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 space-y-3 bg-white">
                {/* 1. Patient Particulars */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-blue-800 mb-2">
                    1. Particulars of the Patient
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                    {v.chiefComplaint && (
                      <span>Chief Complaint: {v.chiefComplaint}</span>
                    )}
                    {v.visitType && <span>Visit Type: {v.visitType}</span>}
                    {formatTime(v.visitDate) && (
                      <span>Date: {formatTime(v.visitDate)}</span>
                    )}
                  </div>
                </div>
                {/* 2. Clinical Diagnosis */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-800 mb-1">
                    2. Clinical Diagnosis
                  </p>
                  <p className="text-sm text-green-700">{diagnosis}</p>
                  {extData.differentialDiagnosis ? (
                    <p className="text-xs text-green-600 mt-1">
                      DDx: {String(extData.differentialDiagnosis)}
                    </p>
                  ) : null}
                </div>
                {/* 3. Salient Features */}
                {extData.salientFeatures ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-purple-800 mb-1">
                      3. Salient Features
                    </p>
                    <p className="text-sm text-purple-700 whitespace-pre-line">
                      {String(extData.salientFeatures)}
                    </p>
                  </div>
                ) : null}
                {/* 4. Investigation Profile */}
                {Array.isArray(extData.previous_investigation_rows) &&
                  (
                    extData.previous_investigation_rows as Array<{
                      name: string;
                      result: string;
                      unit?: string;
                      date?: string;
                    }>
                  ).length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-bold text-amber-800 mb-2">
                        4. Investigation Profile
                      </p>
                      <div className="space-y-1">
                        {(
                          extData.previous_investigation_rows as Array<{
                            name: string;
                            result: string;
                            unit?: string;
                            date?: string;
                          }>
                        ).map((row) => (
                          <p
                            key={`${row.name}-${row.date}`}
                            className="text-xs text-amber-700"
                          >
                            {row.date && `${row.date}: `}
                            {row.name} — {row.result} {row.unit || ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                {/* 5. Ongoing Treatment */}
                {extData.ongoingTreatment ? (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-teal-800 mb-1">
                      5. Ongoing Treatment
                    </p>
                    <p className="text-sm text-teal-700 whitespace-pre-line">
                      {String(extData.ongoingTreatment)}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AccountSettingsTab ────────────────────────────────────────────────────────
function AccountSettingsTab({
  patientId,
  registerNo,
  currentRole,
  patientAccount,
  linkedAccount,
  reminders,
  prescriptionDrugChips,
  onSaveReminders,
}: {
  patientId: bigint | null;
  registerNo?: string;
  currentRole: string;
  patientAccount?: PatientAccount | null;
  linkedAccount?: PatientAccount;
  reminders: DrugReminder[];
  prescriptionDrugChips: string[];
  onSaveReminders: (updated: DrugReminder[]) => void;
}) {
  const { updatePatientCredentials } = useEmailAuth();
  const [acctNewPhone, setAcctNewPhone] = useState("");
  const [acctNewPassword, setAcctNewPassword] = useState("");
  const [showPasswordPlain, setShowPasswordPlain] = useState(false);
  const [signUpEnabledState, setSignUpEnabledState] = useState<boolean | null>(
    null,
  );

  const signUpEnabled =
    signUpEnabledState !== null
      ? signUpEnabledState
      : registerNo
        ? isSignUpEnabled(registerNo)
        : false;

  const handleToggleSignUp = (checked: boolean) => {
    if (!registerNo) return;
    setSignUpEnabled(registerNo, checked);
    setSignUpEnabledState(checked);
    toast.success(
      checked
        ? "Sign-up enabled for this patient"
        : "Sign-up disabled for this patient",
    );
  };

  const handleSave = () => {
    if (!registerNo) return;
    if (!acctNewPhone && !acctNewPassword) {
      toast.error("Enter a new phone or password to save");
      return;
    }
    updatePatientCredentials(
      registerNo,
      acctNewPhone || undefined,
      acctNewPassword || undefined,
    );
    setAcctNewPhone("");
    setAcctNewPassword("");
    toast.success("Credentials updated");
  };

  const [newReminderDrug, setNewReminderDrug] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("08:00");
  const [newReminderTimes, setNewReminderTimes] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      {/* Credentials section (admin/doctor can edit) */}
      {(currentRole === "admin" || currentRole === "doctor") && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
          <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> Patient Login Credentials
          </h3>
          <div className="space-y-3">
            {linkedAccount && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
                <p className="text-blue-800">
                  <span className="font-medium">Current mobile:</span>{" "}
                  <span className="font-mono">{linkedAccount.phone}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-800">Password:</span>
                  <span className="font-mono text-blue-700">
                    {showPasswordPlain
                      ? (() => {
                          try {
                            return (
                              atob(linkedAccount.passwordHash).split("::")[1] ??
                              "••••"
                            );
                          } catch {
                            return "••••";
                          }
                        })()
                      : "••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPasswordPlain(!showPasswordPlain)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    {showPasswordPlain ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">New Mobile Number</Label>
              <Input
                value={acctNewPhone}
                onChange={(e) => setAcctNewPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                type="tel"
                className="mt-1"
                data-ocid="patient_dashboard.account.input"
              />
            </div>
            <div>
              <Label className="text-xs">New Password</Label>
              <Input
                value={acctNewPassword}
                onChange={(e) => setAcctNewPassword(e.target.value)}
                placeholder="Min. 6 chars"
                type="password"
                className="mt-1"
                data-ocid="patient_dashboard.account.input"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Credentials
            </Button>
          </div>

          {registerNo && (
            <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-700">
                  Allow Patient Sign-Up
                </p>
                <p className="text-xs text-gray-500">
                  Let this patient create a portal account
                </p>
              </div>
              <Switch
                checked={signUpEnabled}
                onCheckedChange={handleToggleSignUp}
                data-ocid="patient_dashboard.account.toggle"
              />
            </div>
          )}
        </div>
      )}

      {/* Patient own credentials */}
      {currentRole === "patient" && patientAccount && (
        <div className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">
          <h3 className="font-semibold text-teal-800 mb-4 flex items-center gap-2">
            🔑 My Login Details
          </h3>
          <div className="bg-teal-50 rounded-lg p-3 text-sm space-y-1 mb-3">
            <p className="text-teal-800">
              <span className="font-medium">Mobile:</span>{" "}
              <span className="font-mono">{patientAccount.phone}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="font-medium text-teal-800">Password:</span>
              <span className="font-mono text-teal-700">
                {showPasswordPlain
                  ? (() => {
                      try {
                        return (
                          atob(patientAccount.passwordHash).split("::")[1] ??
                          "••••"
                        );
                      } catch {
                        return "••••";
                      }
                    })()
                  : "••••••••"}
              </span>
              <button
                type="button"
                onClick={() => setShowPasswordPlain(!showPasswordPlain)}
                className="text-teal-500 hover:text-teal-700"
              >
                {showPasswordPlain ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Contact the clinic to update your credentials.
          </p>
        </div>
      )}

      {/* Drug Reminders */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
        <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Drug Reminders
        </h3>

        {/* Auto-suggested drugs from prescriptions */}
        {prescriptionDrugChips.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5">
              Quick add from prescriptions:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {prescriptionDrugChips.map((drug) => (
                <button
                  key={drug}
                  type="button"
                  onClick={() => setNewReminderDrug(drug)}
                  className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors"
                >
                  {drug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing reminders */}
        {reminders.length > 0 && (
          <div className="space-y-2 mb-4">
            {reminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
                data-ocid="patient_dashboard.account.reminder.item"
              >
                <Switch
                  checked={r.enabled}
                  onCheckedChange={() =>
                    onSaveReminders(
                      reminders.map((x) =>
                        x.id === r.id ? { ...x, enabled: !x.enabled } : x,
                      ),
                    )
                  }
                  data-ocid="patient_dashboard.account.toggle"
                />
                <span
                  className={`text-sm flex-1 ${r.enabled ? "text-gray-800" : "text-gray-400 line-through"}`}
                >
                  {r.drugName}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {r.times.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSaveReminders(reminders.filter((x) => x.id !== r.id))
                  }
                  className="text-red-400 hover:text-red-600"
                  data-ocid="patient_dashboard.account.delete_button"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new reminder */}
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-semibold">Add New Reminder</Label>
          <Input
            placeholder="Drug name (e.g. Tab. Napa 500mg)"
            value={newReminderDrug}
            onChange={(e) => setNewReminderDrug(e.target.value)}
            data-ocid="patient_dashboard.account.input"
          />
          <div className="flex gap-2">
            <input
              type="time"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  newReminderTime &&
                  !newReminderTimes.includes(newReminderTime)
                ) {
                  setNewReminderTimes([...newReminderTimes, newReminderTime]);
                }
              }}
            >
              + Add Time
            </Button>
          </div>
          {newReminderTimes.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {newReminderTimes.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-mono"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() =>
                      setNewReminderTimes(
                        newReminderTimes.filter((x) => x !== t),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              if (!newReminderDrug.trim() || newReminderTimes.length === 0) {
                toast.error("Enter a drug name and at least one time");
                return;
              }
              if (Notification.permission === "default")
                Notification.requestPermission();
              const r: DrugReminder = {
                id: `${Date.now()}`,
                patientId: String(patientId),
                drugName: newReminderDrug.trim(),
                times: newReminderTimes,
                enabled: true,
                createdAt: new Date().toISOString(),
              };
              onSaveReminders([...reminders, r]);
              setNewReminderDrug("");
              setNewReminderTimes([]);
              setNewReminderTime("08:00");
              toast.success(`Reminder set for ${r.drugName}`);
            }}
            data-ocid="patient_dashboard.account.save_button"
          >
            <Bell className="w-4 h-4 mr-2" />
            Save Reminder
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main PatientDashboardInner ─────────────────────────────────────────────────
interface PatientDashboardInnerProps {
  patientId: bigint;
  patient: Patient;
  currentRole: "admin" | "doctor" | "staff" | "patient";
  patientAccount?: PatientAccount | null;
  sortedVisits: Visit[];
  latestVisit: Visit | null;
  latestVitals: Record<string, string> | null;
  vitalsHistory: Array<Record<string, unknown>>;
  allInvestigations: Array<{
    date: string;
    name: string;
    result: string;
    unit?: string;
    interpretation?: string;
  }>;
  invByName: Record<
    string,
    { data: Array<{ date: string; value: number }>; unit: string }
  >;
  prescriptions: Prescription[];
  loadingVisits: boolean;
  loadingRx: boolean;
  setShowVisitForm: (v: boolean) => void;
  setSelectedVisit: (v: Visit | null) => void;
  setSelectedRx: (rx: Prescription | null) => void;
  setEditRx: (rx: Prescription | null) => void;
  setPadPrescription: (rx: Prescription | null) => void;
  setShowPadPreview: (v: boolean) => void;
  loadSavedPads: () => void;
  savedPads: Array<Record<string, unknown>>;
  openRxForm: (diagnosis?: string, visitId?: bigint) => void;
  downloadVisitHistoryPDF: () => void;
  downloadSingleVisitPDF: (v: Visit) => void;
  downloadPrescriptionsPDF: () => void;
  downloadSinglePrescriptionPDF: (rx: Prescription) => void;
  age: number | null;
  initials: string;
  formatDateTime: (t: bigint) => string;
}

export default function PatientDashboardInner({
  patientId,
  patient,
  currentRole,
  patientAccount,
  sortedVisits,
  latestVisit,
  latestVitals,
  vitalsHistory,
  allInvestigations,
  invByName,
  prescriptions,
  loadingVisits,
  loadingRx,
  setShowVisitForm,
  setSelectedVisit,
  setSelectedRx,
  setEditRx,
  setPadPrescription,
  setShowPadPreview,
  loadSavedPads,
  savedPads,
  openRxForm,
  downloadVisitHistoryPDF,
  downloadSingleVisitPDF,
  downloadPrescriptionsPDF,
  downloadSinglePrescriptionPDF,
  age,
}: PatientDashboardInnerProps) {
  const registerNo = (patient as Record<string, unknown>).registerNumber as
    | string
    | undefined;
  const linkedAccount = registerNo
    ? loadPatientRegistry().find(
        (p) => p.registerNumber?.toLowerCase() === registerNo.toLowerCase(),
      )
    : undefined;

  // ── Complaints ────────────────────────────────────────────────────────────────
  const [complaints, setComplaints] = useState<ComplaintEntry[]>(() =>
    loadComplaints(String(patientId)),
  );
  const [newComplaintText, setNewComplaintText] = useState("");

  // ── Advice ────────────────────────────────────────────────────────────────────
  const [adviceEntries, setAdviceEntries] = useState<AdviceEntry[]>(() =>
    loadAdviceEntries(String(patientId)),
  );
  const [newAdviceText, setNewAdviceText] = useState("");
  const [newAdviceDate, setNewAdviceDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  // ── Submissions ────────────────────────────────────────────────────────────────
  const [submissions, setSubmissions] = useState<PatientSubmission[]>(() =>
    loadSubmissions(),
  );
  const patientSubmissions = useMemo(
    () => submissions.filter((s) => s.patientId === String(patientId)),
    [submissions, patientId],
  );
  const pendingCount = patientSubmissions.filter(
    (s) => s.status === "pending",
  ).length;

  function approveSubmission(id: string) {
    const all = loadSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "approved" };
      saveSubmissions(all);
      setSubmissions(loadSubmissions());
      toast.success("Submission approved");
    }
  }
  function rejectSubmission(id: string) {
    const all = loadSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], status: "rejected" };
      saveSubmissions(all);
      setSubmissions(loadSubmissions());
      toast.success("Submission rejected");
    }
  }

  // ── Drug Reminders ────────────────────────────────────────────────────────────
  const REMINDERS_KEY = "medicare_drug_reminders";
  const [reminders, setReminders] = useState<DrugReminder[]>(() => {
    try {
      const all: DrugReminder[] = JSON.parse(
        localStorage.getItem(REMINDERS_KEY) || "[]",
      );
      return all.filter((r) => r.patientId === patientId.toString());
    } catch {
      return [];
    }
  });

  const saveReminders = (updated: DrugReminder[]) => {
    setReminders(updated);
    const all: DrugReminder[] = (() => {
      try {
        return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]");
      } catch {
        return [];
      }
    })();
    const others = all.filter((r) => r.patientId !== patientId.toString());
    localStorage.setItem(
      REMINDERS_KEY,
      JSON.stringify([...others, ...updated]),
    );
  };

  const prescriptionDrugChips = useMemo(() => {
    const drugs: string[] = [];
    for (const rx of prescriptions) {
      for (const m of rx.medications || []) {
        const name = [m.drugForm || m.form, m.drugName || m.name, m.dose]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (name && !drugs.includes(name)) drugs.push(name);
      }
    }
    return drugs.slice(0, 20);
  }, [prescriptions]);

  // ── Investigations search ──────────────────────────────────────────────────────
  const [invSearch, setInvSearch] = useState("");
  const filteredInvRows = useMemo(() => {
    if (!invSearch) return allInvestigations.slice(0, 50);
    return allInvestigations.filter((r) =>
      r.name.toLowerCase().includes(invSearch.toLowerCase()),
    );
  }, [allInvestigations, invSearch]);

  // ── Pregnancy ─────────────────────────────────────────────────────────────────
  const [pregnancyData, setPregnancyData] = useState<{
    lmp: string;
    gravida: string;
    para: string;
    active: boolean;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(`pregnancy_${patientId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [showPregnancyForm, setShowPregnancyForm] = useState(false);
  const [lmpInput, setLmpInput] = useState("");
  const [gravidaInput, setGravidaInput] = useState("");
  const [paraInput, setParaInput] = useState("");

  const savePregnancyData = () => {
    if (!lmpInput) return;
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
    localStorage.removeItem(`pregnancy_${patientId}`);
    setPregnancyData(null);
  };
  const calcPregnancy = (lmp: string) => {
    const lmpDate = new Date(lmp);
    const diffDays = Math.floor(
      (Date.now() - lmpDate.getTime()) / (1000 * 60 * 60 * 24),
    );
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

  // ── Patient Submit Data ───────────────────────────────────────────────────────
  const [submitTab, setSubmitTab] = useState("complaint");
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
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);

  function handleSubmitData() {
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
        toast.error("Enter investigation name and result");
        return;
      }
      type = "investigation";
      data = { ...invFields };
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
    setSubmissions(loadSubmissions());
    toast.success("Submitted! Awaiting doctor approval.");
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
  }

  const bmi = (() => {
    const wt = latestVitals?.weight
      ? Number.parseFloat(latestVitals.weight)
      : patient.weight;
    const ht = latestVitals?.height
      ? Number.parseFloat(latestVitals.height)
      : patient.height;
    if (!wt || !ht) return null;
    return Math.round((wt / ((ht / 100) * (ht / 100))) * 10) / 10;
  })();
  const bmiCat = bmi ? getBMICategory(bmi) : null;

  const TAB_CONFIG = [
    {
      value: "overview",
      label: "🏠 Overview",
      activeClass: "data-[state=active]:bg-blue-500",
    },
    {
      value: "vitals",
      label: "❤️ Vitals",
      activeClass: "data-[state=active]:bg-red-500",
    },
    {
      value: "investigations",
      label: "🧪 Investigations",
      activeClass: "data-[state=active]:bg-teal-600",
    },
    {
      value: "history",
      label: "📋 History",
      activeClass: "data-[state=active]:bg-purple-500",
    },
    {
      value: "prescriptions",
      label: "💊 Prescriptions",
      activeClass: "data-[state=active]:bg-indigo-500",
    },
    {
      value: "appointments",
      label: "📅 Appointments",
      activeClass: "data-[state=active]:bg-green-600",
    },
    {
      value: "pending",
      label: "⏳ Pending",
      activeClass: "data-[state=active]:bg-amber-500",
      badge: pendingCount,
    },
    {
      value: "complaints",
      label: "📝 Complaints",
      activeClass: "data-[state=active]:bg-pink-500",
      badge:
        currentRole === "doctor" || currentRole === "admin"
          ? complaints.filter((c) => c.status === "pending").length
          : 0,
    },
    {
      value: "advice",
      label: "💡 Advice",
      activeClass: "data-[state=active]:bg-emerald-600",
    },
    {
      value: "chat",
      label: "💬 Chat",
      activeClass: "data-[state=active]:bg-cyan-600",
    },
    {
      value: "account",
      label: "⚙️ Account",
      activeClass: "data-[state=active]:bg-slate-600",
    },
  ];

  return (
    <Tabs defaultValue="overview" className="w-full">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* VERTICAL TAB NAV */}
        <div className="lg:w-52 shrink-0">
          <TabsList className="flex flex-row lg:flex-col w-full h-auto p-1.5 gap-1 bg-gray-100 rounded-xl overflow-x-auto lg:overflow-x-visible">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`w-full justify-start text-left shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium relative data-[state=active]:text-white data-[state=active]:shadow-md ${tab.activeClass}`}
                data-ocid="patient_dashboard.tab"
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 min-w-0">
          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-4">
            {/* Patient profile card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              {currentRole === "patient" && (
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50"
                    onClick={() => setShowSubmitPanel(!showSubmitPanel)}
                    data-ocid="patient_dashboard.overview.open_modal_button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Update My Health
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[220px]">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" /> Patient Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5 text-sm">
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
                      ["Register No.", registerNo || "N/A"],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                        <p className="font-semibold text-gray-800 text-sm">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {latestVisit && (
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" /> Latest
                      Visit
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
              {bmi && bmiCat && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500">BMI</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {bmi}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        kg/m²
                      </span>
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold ${bmiCat.color}`}
                  >
                    {bmiCat.label}
                  </span>
                </div>
              )}
            </div>

            {/* Latest vitals */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" /> Latest Vitals
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

            {/* Pregnancy Card */}
            {patient.gender === "female" &&
              (currentRole === "doctor" || currentRole === "admin") && (
                <div className="bg-white rounded-xl border border-pink-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Baby className="w-4 h-4 text-pink-500" /> Pregnancy
                      Status
                    </h3>
                    <div className="flex gap-2">
                      {pregnancyData?.active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-red-300 text-red-600"
                          onClick={clearPregnancyData}
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-pink-300 text-pink-600"
                        onClick={() => setShowPregnancyForm(!showPregnancyForm)}
                      >
                        {pregnancyData?.active ? "Update" : "Set Pregnancy"}
                      </Button>
                    </div>
                  </div>
                  {showPregnancyForm && (
                    <div className="bg-pink-50 rounded-lg p-3 mb-3 space-y-2 border border-pink-100">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            id: "preg-lmp",
                            label: "LMP Date",
                            type: "date",
                            value: lmpInput,
                            onChange: setLmpInput,
                          },
                          {
                            id: "preg-gravida",
                            label: "Gravida",
                            type: "number",
                            value: gravidaInput,
                            onChange: setGravidaInput,
                          },
                          {
                            id: "preg-para",
                            label: "Para",
                            type: "number",
                            value: paraInput,
                            onChange: setParaInput,
                          },
                        ].map((field) => (
                          <div key={field.id}>
                            <label
                              htmlFor={field.id}
                              className="text-xs text-gray-500 mb-1 block"
                            >
                              {field.label}
                            </label>
                            <input
                              id={field.id}
                              type={field.type}
                              min="0"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                              data-ocid="patient_dashboard.pregnancy.input"
                            />
                          </div>
                        ))}
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
                              <p className="text-xs text-gray-500">Weeks</p>
                            </div>
                            <div className="bg-rose-50 rounded-lg p-3 text-center">
                              <p className="text-2xl font-bold text-rose-600">
                                {info.months}
                              </p>
                              <p className="text-xs text-gray-500">Months</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                              <p className="text-sm font-bold text-purple-600">
                                {info.edd}
                              </p>
                              <p className="text-xs text-gray-500">EDD</p>
                            </div>
                          </div>
                          {pregnancyData.gravida && (
                            <p className="text-xs text-gray-500">
                              G{pregnancyData.gravida}P{pregnancyData.para || 0}
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
                                <span className="text-pink-400 mt-0.5">•</span>
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

            {/* Patient data submission panel */}
            {currentRole === "patient" && showSubmitPanel && (
              <div className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">
                <h3 className="font-semibold text-teal-800 mb-3">
                  Submit Health Data
                </h3>
                <div className="flex gap-2 mb-4">
                  {["complaint", "vitals", "investigation"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSubmitTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${submitTab === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {submitTab === "complaint" && (
                  <Textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="Describe your symptoms..."
                    rows={3}
                    data-ocid="patient_dashboard.submit.textarea"
                  />
                )}
                {submitTab === "vitals" && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "systolic", label: "Systolic BP (mmHg)" },
                      { key: "diastolic", label: "Diastolic BP (mmHg)" },
                      { key: "pulse", label: "Pulse (beats/min)" },
                      { key: "temp", label: "Temperature (°C)" },
                      { key: "spo2", label: "SpO₂ (%)" },
                      { key: "weight", label: "Weight (kg)" },
                    ].map((f) => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          value={vitalFields[f.key as keyof typeof vitalFields]}
                          onChange={(e) =>
                            setVitalFields((prev) => ({
                              ...prev,
                              [f.key]: e.target.value,
                            }))
                          }
                          placeholder="Value"
                          type="number"
                          className="mt-1"
                          data-ocid="patient_dashboard.submit.input"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {submitTab === "investigation" && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "name", label: "Test Name" },
                      { key: "result", label: "Result" },
                      { key: "unit", label: "Unit" },
                      { key: "date", label: "Date" },
                    ].map((f) => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          value={invFields[f.key as keyof typeof invFields]}
                          onChange={(e) =>
                            setInvFields((prev) => ({
                              ...prev,
                              [f.key]: e.target.value,
                            }))
                          }
                          type={f.key === "date" ? "date" : "text"}
                          className="mt-1"
                          data-ocid="patient_dashboard.submit.input"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  className="mt-3 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleSubmitData}
                  data-ocid="patient_dashboard.submit.submit_button"
                >
                  Submit for Doctor Review
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── VITALS ── */}
          <TabsContent value="vitals" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" /> Vital Signs Summary
              </h3>
              <VitalsBar
                vitals={latestVitals}
                weight={patient.weight}
                height={patient.height}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VitalGraph
                title="Blood Pressure"
                data={vitalsHistory}
                dataKey={["BP", "Diastolic", "MAP"]}
                unit="mmHg"
                color={["#ef4444", "#3b82f6", "#16a34a"]}
                bgClass="bg-rose-50"
                borderClass="border-rose-200"
                icon={Heart}
              />
              <VitalGraph
                title="Pulse Rate"
                data={vitalsHistory}
                dataKey="Pulse"
                unit="beats/min"
                color="#f97316"
                bgClass="bg-orange-50"
                borderClass="border-orange-200"
                icon={Activity}
              />
              <VitalGraph
                title="SpO₂"
                data={vitalsHistory}
                dataKey="SpO2"
                unit="%"
                color="#3b82f6"
                bgClass="bg-blue-50"
                borderClass="border-blue-200"
                icon={Wind}
              />
              <VitalGraph
                title="Temperature"
                data={vitalsHistory}
                dataKey="Temp"
                unit="°C"
                color="#8b5cf6"
                bgClass="bg-purple-50"
                borderClass="border-purple-200"
                icon={Thermometer}
              />
              <VitalGraph
                title="Weight"
                data={vitalsHistory}
                dataKey="Weight"
                unit="kg"
                color="#0d9488"
                bgClass="bg-teal-50"
                borderClass="border-teal-200"
                icon={User}
              />
              <VitalGraph
                title="Respiratory Rate"
                data={vitalsHistory}
                dataKey="RespRate"
                unit="breaths/min"
                color="#0891b2"
                bgClass="bg-cyan-50"
                borderClass="border-cyan-200"
                icon={Wind}
              />
              <VitalGraph
                title="BMI Trend"
                data={vitalsHistory}
                dataKey="BMI"
                unit="kg/m²"
                color="#6366f1"
                bgClass="bg-indigo-50"
                borderClass="border-indigo-200"
                icon={Activity}
              />
            </div>
          </TabsContent>

          {/* ── INVESTIGATIONS ── */}
          <TabsContent value="investigations" className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-teal-600" />{" "}
                  Investigation Reports
                </h3>
                <div className="relative w-52">
                  <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search test..."
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
            {Object.keys(invByName).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(invByName)
                  .slice(0, 12)
                  .map(([name, { data, unit }]) => (
                    <div
                      key={name}
                      className="bg-white rounded-xl border border-teal-200 shadow-sm p-4"
                    >
                      <h4 className="font-semibold text-teal-800 mb-1 text-sm">
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
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
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
                              formatter={(v: number) => [`${v} ${unit}`, name]}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#0d9488"
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
                  <Clock className="w-4 h-4 text-purple-600" /> Visit History
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-purple-700 border-purple-300 gap-1.5"
                    onClick={downloadVisitHistoryPDF}
                    data-ocid="patient_dashboard.visits.secondary_button"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </Button>
                  {(currentRole === "doctor" || currentRole === "admin") && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                      onClick={() => setShowVisitForm(true)}
                      data-ocid="patient_dashboard.visits.open_modal_button"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Visit
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
              ) : (
                <HistoryTabContent
                  sortedVisits={sortedVisits}
                  currentRole={currentRole}
                  setSelectedVisit={setSelectedVisit}
                  downloadSingleVisitPDF={downloadSingleVisitPDF}
                  openRxForm={openRxForm}
                />
              )}
            </div>
          </TabsContent>

          {/* ── PRESCRIPTIONS ── */}
          <TabsContent value="prescriptions">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> Prescriptions
                  ({prescriptions.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-indigo-700 border-indigo-300 gap-1.5"
                    onClick={downloadPrescriptionsPDF}
                    data-ocid="patient_dashboard.prescriptions.secondary_button"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </Button>
                  {(currentRole === "doctor" || currentRole === "admin") && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                      onClick={() => openRxForm()}
                      data-ocid="patient_dashboard.prescriptions.open_modal_button"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Rx
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
                  <p className="text-sm text-gray-400">No prescriptions yet</p>
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
                        className="bg-card border border-border rounded-xl p-3 hover:shadow-sm transition-all"
                        data-ocid={`patient_dashboard.prescriptions.item.${idx + 1}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
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
                            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-amber-300 text-amber-700"
                                onClick={() => setEditRx(rx)}
                                data-ocid={`patient_dashboard.prescriptions.edit_button.${idx + 1}`}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700"
                                onClick={() => setSelectedRx(rx)}
                                data-ocid={`patient_dashboard.prescriptions.secondary_button.${idx + 1}`}
                              >
                                <FileText className="w-3 h-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-green-300 text-green-700"
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-purple-300 text-purple-700"
                                onClick={() =>
                                  downloadSinglePrescriptionPDF(rx)
                                }
                                data-ocid={`patient_dashboard.prescriptions.button.${idx + 1}`}
                              >
                                <Download className="w-3 h-3" />
                                PDF
                              </Button>
                            </div>
                          )}
                          {(currentRole === "patient" ||
                            currentRole === "staff") && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700"
                                onClick={() => setSelectedRx(rx)}
                                data-ocid={`patient_dashboard.prescriptions.secondary_button.${idx + 1}`}
                              >
                                <FileText className="w-3 h-3" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-purple-300 text-purple-700"
                                onClick={() =>
                                  downloadSinglePrescriptionPDF(rx)
                                }
                                data-ocid={`patient_dashboard.prescriptions.button.${idx + 1}`}
                              >
                                <Download className="w-3 h-3" />
                                PDF
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Saved Prescription Pads */}
            {savedPads.length > 0 && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5 mt-3">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-green-600" /> Saved
                  Prescription Pads
                </h3>
                <div className="space-y-2">
                  {savedPads.map((pad, idx) => (
                    <div
                      key={String(pad.id ?? `pad-${idx}`)}
                      className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 border border-green-100"
                      data-ocid={`patient_dashboard.prescriptions.item.${idx + 1}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          {String(pad.diagnosis || "Prescription Pad")}
                        </p>
                        <p className="text-xs text-green-600">
                          {String(pad.date || "")}
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
                            const meds = Array.isArray(pad.medications)
                              ? pad.medications
                              : [];
                            win.document.write(
                              `<!DOCTYPE html><html><head><title>Prescription Pad</title><style>body{font-family:Arial,sans-serif;padding:20px}</style></head><body><h2>Prescription — ${String(pad.patientName || "")}</h2><p>Date: ${String(pad.date || "")}</p><p>Diagnosis: ${String(pad.diagnosis || "N/A")}</p><h3>Medications:</h3><ul>${meds.map((m: Record<string, unknown>) => `<li><strong>${String(m.name || "")}</strong> — ${String(m.dose || "")} ${String(m.frequency || "")} ${String(m.duration || "")}</li>`).join("")}</ul></body></html>`,
                            );
                            win.document.close();
                            win.print();
                          }
                        }}
                        data-ocid={`patient_dashboard.prescriptions.secondary_button.${idx + 1}`}
                      >
                        <Download className="w-3 h-3" />
                        Print
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
              patientName={patient.fullName}
            />
          </TabsContent>

          {/* ── PENDING APPROVALS ── */}
          <TabsContent value="pending">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Pending
                Approvals
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

          {/* ── COMPLAINTS ── */}
          <TabsContent value="complaints" className="space-y-4">
            {currentRole === "patient" && (
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border-2 border-pink-300 shadow-sm p-5">
                <h3 className="font-semibold text-pink-800 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Submit a Complaint
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "Fever",
                    "Headache",
                    "Chest Pain",
                    "Cough",
                    "Nausea",
                    "Vomiting",
                    "Dizziness",
                    "Pain",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setNewComplaintText((prev) =>
                          prev ? `${prev}, ${chip}` : chip,
                        )
                      }
                      className="text-xs bg-pink-100 hover:bg-pink-200 border border-pink-300 text-pink-700 px-2.5 py-1 rounded-full font-medium transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Describe your symptoms or concerns..."
                  value={newComplaintText}
                  onChange={(e) => setNewComplaintText(e.target.value)}
                  rows={3}
                  className="mb-3 border-pink-200"
                  data-ocid="patient_dashboard.complaints.textarea"
                />
                <Button
                  onClick={() => {
                    if (!newComplaintText.trim()) return;
                    const entry: ComplaintEntry = {
                      id:
                        Date.now().toString(36) +
                        Math.random().toString(36).slice(2),
                      patientId: String(patientId),
                      text: newComplaintText.trim(),
                      timestamp: new Date().toISOString(),
                      status: "pending",
                    };
                    const updated = [entry, ...complaints];
                    setComplaints(updated);
                    saveComplaints(String(patientId), updated);
                    setNewComplaintText("");
                    toast.success("Complaint submitted");
                  }}
                  className="bg-pink-600 hover:bg-pink-700 w-full"
                  data-ocid="patient_dashboard.complaints.submit_button"
                >
                  <MessageCircle className="w-4 h-4 mr-1" /> Submit Complaint
                </Button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-pink-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-pink-600" /> Complaints Log
                {complaints.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    {complaints.length} entries
                  </span>
                )}
              </h3>
              {complaints.length === 0 ? (
                <p
                  className="text-sm text-gray-400 text-center py-4"
                  data-ocid="patient_dashboard.complaints.empty_state"
                >
                  No complaints submitted yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {complaints.map((c, idx) => (
                    <div
                      key={c.id}
                      className="border border-gray-200 rounded-xl p-4 space-y-2"
                      data-ocid={`patient_dashboard.complaints.item.${idx + 1}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {c.text}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(
                              new Date(c.timestamp),
                              "MMM d, yyyy 'at' h:mm a",
                            )}
                          </p>
                        </div>
                        <Badge
                          className={
                            c.status === "seen"
                              ? "bg-green-100 text-green-700 border-0 shrink-0"
                              : "bg-amber-100 text-amber-700 border-0 shrink-0"
                          }
                        >
                          {c.status === "seen" ? "Seen" : "Pending"}
                        </Badge>
                      </div>
                      {c.doctorNote && (
                        <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-800">
                          <span className="font-semibold">Doctor's note:</span>{" "}
                          {c.doctorNote}
                        </div>
                      )}
                      {(currentRole === "doctor" ||
                        currentRole === "admin") && (
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <Input
                            placeholder="Add a note for the patient (optional)..."
                            defaultValue={c.doctorNote || ""}
                            onBlur={(e) => {
                              const note = e.target.value.trim();
                              if (note !== (c.doctorNote || "")) {
                                const updated = complaints.map((x) =>
                                  x.id === c.id
                                    ? { ...x, doctorNote: note }
                                    : x,
                                );
                                setComplaints(updated);
                                saveComplaints(String(patientId), updated);
                              }
                            }}
                            className="text-sm"
                            data-ocid="patient_dashboard.complaints.input"
                          />
                          {c.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => {
                                const updated = complaints.map((x) =>
                                  x.id === c.id
                                    ? { ...x, status: "seen" as const }
                                    : x,
                                );
                                setComplaints(updated);
                                saveComplaints(String(patientId), updated);
                                toast.success("Marked as seen");
                              }}
                              data-ocid="patient_dashboard.complaints.confirm_button"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark
                              as Seen
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── ADVICE ── */}
          <TabsContent value="advice" className="space-y-4">
            {(currentRole === "doctor" || currentRole === "admin") && (
              <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5">
                <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> Add Advice
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <input
                      type="date"
                      value={newAdviceDate}
                      onChange={(e) => setNewAdviceDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      data-ocid="patient_dashboard.advice.input"
                    />
                  </div>
                  <Textarea
                    placeholder="Enter advice or instructions..."
                    value={newAdviceText}
                    onChange={(e) => setNewAdviceText(e.target.value)}
                    rows={3}
                    data-ocid="patient_dashboard.advice.textarea"
                  />
                  <Button
                    onClick={() => {
                      if (!newAdviceText.trim()) return;
                      const entry: AdviceEntry = {
                        id:
                          Date.now().toString(36) +
                          Math.random().toString(36).slice(2),
                        patientId: String(patientId),
                        text: newAdviceText.trim(),
                        date: newAdviceDate || new Date().toISOString(),
                        addedBy: currentRole,
                        source: "Doctor's Note",
                      };
                      const updated = [entry, ...adviceEntries];
                      setAdviceEntries(updated);
                      saveAdviceEntries(String(patientId), updated);
                      setNewAdviceText("");
                      toast.success("Advice added");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-ocid="patient_dashboard.advice.submit_button"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Advice
                  </Button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-600" /> Advice &
                Instructions
              </h3>
              {adviceEntries.length === 0 ? (
                <p
                  className="text-sm text-gray-400 text-center py-6"
                  data-ocid="patient_dashboard.advice.empty_state"
                >
                  No advice or instructions recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {adviceEntries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="border border-emerald-100 rounded-xl p-4 bg-emerald-50"
                      data-ocid={`patient_dashboard.advice.item.${idx + 1}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                            {entry.source}
                          </span>
                          <span className="text-xs text-gray-400">
                            {entry.date
                              ? format(new Date(entry.date), "MMM d, yyyy")
                              : "—"}
                          </span>
                        </div>
                        {(currentRole === "doctor" ||
                          currentRole === "admin") && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = adviceEntries.filter(
                                (e) => e.id !== entry.id,
                              );
                              setAdviceEntries(updated);
                              saveAdviceEntries(String(patientId), updated);
                            }}
                            className="text-red-400 hover:text-red-600"
                            data-ocid="patient_dashboard.advice.delete_button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {entry.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── CHAT ── */}
          <TabsContent value="chat">
            <PatientChat
              patientId={patientId}
              currentRole={currentRole}
              currentUserName={
                currentRole === "patient" ? patient.fullName : "Doctor"
              }
            />
          </TabsContent>

          {/* ── ACCOUNT SETTINGS ── */}
          <TabsContent value="account">
            <AccountSettingsTab
              patientId={patientId}
              registerNo={registerNo}
              currentRole={currentRole}
              patientAccount={patientAccount}
              linkedAccount={linkedAccount}
              reminders={reminders}
              prescriptionDrugChips={prescriptionDrugChips}
              onSaveReminders={saveReminders}
            />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
