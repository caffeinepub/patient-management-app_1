import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit2,
  Inbox,
  ListOrdered,
  Loader2,
  MessageCircle,
  Monitor,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  UserSearch,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PatientForm, { type PatientFormData } from "../components/PatientForm";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { useCreatePatient, useGetAllPatients } from "../hooks/useQueries";

// ─── Types ──────────────────────────────────────────────────────────────────

type SerialStatus = "waiting" | "in-progress" | "done";
type AppointmentStatus = "scheduled" | "confirmed" | "cancelled";

interface SerialEntry {
  id: string;
  serial: number;
  patientName: string;
  phone: string;
  arrivalTime: string;
  status: SerialStatus;
}

interface AppointmentEntry {
  id: string;
  patientName: string;
  phone: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  doctor?: string;
  chamber?: string;
  registerNumber?: string;
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

function todayKey() {
  return `clinic_serials_${new Date().toISOString().slice(0, 10)}`;
}

function loadSerials(): SerialEntry[] {
  try {
    return JSON.parse(localStorage.getItem(todayKey()) || "[]");
  } catch {
    return [];
  }
}

function saveSerials(data: SerialEntry[]) {
  localStorage.setItem(todayKey(), JSON.stringify(data));
}

function loadAppointments(): AppointmentEntry[] {
  try {
    const a = JSON.parse(localStorage.getItem("clinic_appointments") || "[]");
    const b = JSON.parse(
      localStorage.getItem("public_appointment_requests") || "[]",
    );
    // Merge: public requests that have preferredDate → convert to AppointmentEntry
    const converted = b
      .filter((x: Record<string, unknown>) => x.preferredDate || x.date)
      .map((x: Record<string, unknown>) => ({
        id: x.id || x.patientName,
        patientName: (x.patientName || x.name || "") as string,
        phone: (x.phone || "") as string,
        date: (x.preferredDate || x.date || "") as string,
        time: (x.preferredTime || x.time || "") as string,
        reason: (x.reason || x.notes || "") as string,
        status:
          (x.status as AppointmentStatus) === "confirmed"
            ? "confirmed"
            : (x.status as AppointmentStatus) === "cancelled"
              ? "cancelled"
              : "scheduled",
        doctor: (x.preferredDoctor || x.doctor || "") as string,
        chamber: (x.preferredChamber || x.chamber || "") as string,
        registerNumber: (x.registerNumber || "") as string,
        _isPublic: true,
      }));
    // Deduplicate by id
    const combined: AppointmentEntry[] = [...a];
    for (const c of converted) {
      if (!combined.find((x) => x.id === c.id)) combined.push(c);
    }
    return combined;
  } catch {
    return [];
  }
}

function saveAppointments(data: AppointmentEntry[]) {
  localStorage.setItem("clinic_appointments", JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function nowTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

// ─── Patient register number lookup ─────────────────────────────────────────

function normalizeRegNo(rn: string): string {
  const parts = rn.trim().split("/");
  if (parts.length === 2) {
    const num = Number.parseInt(parts[0].trim(), 10);
    return `${Number.isNaN(num) ? parts[0].trim() : num}/${parts[1].trim()}`;
  }
  return rn.trim().toLowerCase();
}

interface PatientLookup {
  fullName?: string;
  phone?: string;
  registerNumber?: string;
  [key: string]: unknown;
}

function lookupPatientByRegNo(regNo: string): PatientLookup | null {
  if (!regNo.trim()) return null;
  const norm = normalizeRegNo(regNo);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("patients_")) continue;
    try {
      const arr = JSON.parse(
        localStorage.getItem(key) || "[]",
      ) as PatientLookup[];
      const found = arr.find(
        (p) =>
          p.registerNumber && normalizeRegNo(String(p.registerNumber)) === norm,
      );
      if (found) return found;
    } catch {}
  }
  return null;
}

// ─── Patient Search Dropdown ─────────────────────────────────────────────────

interface PatientSearchProps {
  value: string;
  onSelect: (name: string, phone: string) => void;
  onChange: (v: string) => void;
}

function PatientSearch({ value, onSelect, onChange }: PatientSearchProps) {
  const { data: patients = [], isLoading } = useGetAllPatients();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? patients.filter((p) =>
        p.fullName.toLowerCase().includes(value.toLowerCase()),
      )
    : [];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search or type patient name…"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          data-ocid="appointments.search_input"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id.toString()}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2"
              onClick={() => {
                onSelect(p.fullName, p.phone || "");
                setOpen(false);
              }}
            >
              <span className="font-medium text-foreground">{p.fullName}</span>
              {p.phone && (
                <span className="text-muted-foreground text-xs">{p.phone}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status Badges ────────────────────────────────────────────────────────────

const serialStatusConfig: Record<
  SerialStatus,
  { label: string; className: string }
> = {
  waiting: {
    label: "Waiting",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  done: {
    label: "Done",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

const apptStatusConfig: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

// ─── Doctor Serial Tab ────────────────────────────────────────────────────────

function DoctorSerialTab() {
  const [serials, setSerials] = useState<SerialEntry[]>(loadSerials);
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const { currentDoctor } = useEmailAuth();
  const isDoctor = !currentDoctor || currentDoctor.role === "doctor";

  const persist = (data: SerialEntry[]) => {
    setSerials(data);
    saveSerials(data);
    const nowServing = data.find((s) => s.status === "in-progress") || null;
    const queue = data.filter((s) => s.status === "waiting");
    localStorage.setItem(
      "medicare_serial_queue",
      JSON.stringify({ nowServing, queue }),
    );
  };

  function addSerial() {
    if (!form.name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    const next =
      serials.length > 0 ? Math.max(...serials.map((s) => s.serial)) + 1 : 1;
    const entry: SerialEntry = {
      id: uid(),
      serial: next,
      patientName: form.name.trim(),
      phone: form.phone.trim(),
      arrivalTime: nowTime(),
      status: "waiting",
    };
    persist([...serials, entry]);
    setForm({ name: "", phone: "" });
    setAddOpen(false);
    toast.success(`Serial #${next} added for ${entry.patientName}`);
  }

  function updateStatus(id: string, status: SerialStatus) {
    persist(serials.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  function deleteSerial(id: string) {
    persist(serials.filter((s) => s.id !== id));
    toast.success("Serial removed");
  }

  function resetQueue() {
    persist([]);
    setResetOpen(false);
    toast.success("Queue reset for today");
  }

  const counts = {
    waiting: serials.filter((s) => s.status === "waiting").length,
    inProgress: serials.filter((s) => s.status === "in-progress").length,
    done: serials.filter((s) => s.status === "done").length,
  };

  const todayLabel = new Date().toLocaleDateString("en-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Today
          </p>
          <p className="text-lg font-semibold text-foreground">{todayLabel}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open("/serial-display", "_blank", "noopener,noreferrer")
            }
            className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
            data-ocid="serial.display_button"
          >
            <Monitor className="w-3.5 h-3.5" />
            Display Screen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetOpen(true)}
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            data-ocid="serial.reset_button"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Queue
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setAddOpen(true)}
            data-ocid="serial.open_modal_button"
          >
            <Plus className="w-4 h-4" />
            Add Serial
          </Button>
        </div>
      </div>

      {/* Count pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{counts.waiting}</p>
          <p className="text-xs text-amber-600 mt-0.5">Waiting</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">
            {counts.inProgress}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">In Progress</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{counts.done}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Done</p>
        </div>
      </div>

      {serials.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground"
          data-ocid="serial.empty_state"
        >
          <ListOrdered className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium">No patients in queue</p>
          <p className="text-sm mt-1">Add the first serial for today</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm" data-ocid="serial.table">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-12">
                  #
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Patient
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                  Phone
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                  Arrival
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {serials.map((s, idx) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    data-ocid={`serial.row.${idx + 1}`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {s.serial}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {s.patientName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {s.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {s.arrivalTime}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={serialStatusConfig[s.status].className}
                      >
                        {serialStatusConfig[s.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.status === "waiting" && isDoctor && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs"
                            onClick={() => updateStatus(s.id, "in-progress")}
                            data-ocid={`serial.secondary_button.${idx + 1}`}
                          >
                            Start
                          </Button>
                        )}
                        {s.status === "in-progress" && isDoctor && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 text-xs"
                            onClick={() => updateStatus(s.id, "done")}
                            data-ocid={`serial.primary_button.${idx + 1}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Done
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSerial(s.id)}
                          data-ocid={`serial.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Add Serial Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="serial.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-primary" />
              Add Patient to Queue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Patient Name</Label>
              <PatientSearch
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                onSelect={(name, phone) => setForm({ name, phone })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                data-ocid="serial.input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              data-ocid="serial.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={addSerial} data-ocid="serial.submit_button">
              Add to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirm Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm" data-ocid="serial.modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Reset Today&apos;s Queue?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will clear all {serials.length} serial entries for today.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              data-ocid="serial.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={resetQueue}
              data-ocid="serial.confirm_button"
            >
              Reset Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────

type ApptFilter = "all" | "today" | "upcoming" | "cancelled";

// Chamber list for the appointment form
const CHAMBERS_BY_DOCTOR: Record<string, string[]> = {
  "Dr. Arman Kabir": [
    "University Dental College & Hospital — Moghbazar, Dhaka",
  ],
  "Dr. Samia Shikder": [
    "Dhaka Medical College Hospital — Dept. of Gynae & Obs",
  ],
};

function AppointmentsTab() {
  const [appointments, setAppointments] =
    useState<AppointmentEntry[]>(loadAppointments);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentEntry | null>(null);
  const [filter, setFilter] = useState<ApptFilter>("all");
  const [regNoInput, setRegNoInput] = useState("");
  const [regNoMsg, setRegNoMsg] = useState("");

  const emptyForm = {
    name: "",
    phone: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    reason: "",
    status: "scheduled" as AppointmentStatus,
    doctor: "",
    chamber: "",
    registerNumber: "",
  };
  const [form, setForm] = useState(emptyForm);

  const persist = (data: AppointmentEntry[]) => {
    setAppointments(data);
    saveAppointments(data);
  };

  const handleRegNoLookup = (val: string) => {
    setRegNoInput(val);
    setForm((f) => ({ ...f, registerNumber: val }));
    if (!val.trim()) {
      setRegNoMsg("");
      return;
    }
    const found = lookupPatientByRegNo(val);
    if (found) {
      setForm((f) => ({
        ...f,
        name: (found.fullName as string) || f.name,
        phone: (found.phone as string) || f.phone,
        registerNumber: val,
      }));
      setRegNoMsg(`✓ Found: ${found.fullName}`);
    } else {
      setRegNoMsg("Register number not found");
    }
  };

  function openAdd() {
    setForm(emptyForm);
    setRegNoInput("");
    setRegNoMsg("");
    setEditTarget(null);
    setAddOpen(true);
  }

  function openEdit(appt: AppointmentEntry) {
    setForm({
      name: appt.patientName,
      phone: appt.phone,
      date: appt.date,
      time: appt.time,
      reason: appt.reason,
      status: appt.status,
      doctor: appt.doctor || "",
      chamber: appt.chamber || "",
      registerNumber: appt.registerNumber || "",
    });
    setRegNoInput(appt.registerNumber || "");
    setRegNoMsg("");
    setEditTarget(appt);
    setAddOpen(true);
  }

  function saveAppointment() {
    if (!form.name.trim()) {
      toast.error("Patient name is required");
      return;
    }
    if (!form.date) {
      toast.error("Please select a date");
      return;
    }

    if (editTarget) {
      persist(
        appointments.map((a) =>
          a.id === editTarget.id
            ? {
                ...a,
                patientName: form.name.trim(),
                phone: form.phone.trim(),
                date: form.date,
                time: form.time,
                reason: form.reason.trim(),
                status: form.status,
                doctor: form.doctor || undefined,
                chamber: form.chamber || undefined,
                registerNumber: form.registerNumber || undefined,
              }
            : a,
        ),
      );
      toast.success("Appointment updated");
    } else {
      const entry: AppointmentEntry = {
        id: uid(),
        patientName: form.name.trim(),
        phone: form.phone.trim(),
        date: form.date,
        time: form.time,
        reason: form.reason.trim(),
        status: form.status,
        doctor: form.doctor || undefined,
        chamber: form.chamber || undefined,
        registerNumber: form.registerNumber || undefined,
      };
      persist([...appointments, entry]);
      toast.success(`Appointment scheduled for ${entry.patientName}`);
    }
    setAddOpen(false);
  }

  function deleteAppt(id: string) {
    persist(appointments.filter((a) => a.id !== id));
    toast.success("Appointment deleted");
  }

  function sendWhatsApp(appt: AppointmentEntry) {
    const DOCTOR_NUMBERS: Record<string, string> = {
      "Dr. Arman Kabir": "8801751959262",
      "Dr. Samia Shikder": "8801957212210",
    };
    const docName = appt.doctor || "Dr. Arman Kabir";
    const docNum = DOCTOR_NUMBERS[docName] || "8801751959262";
    const dateStr = appt.date
      ? new Date(appt.date).toLocaleDateString("en-BD", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : appt.date;
    const msg = `Dear ${appt.patientName}, your appointment with ${docName} is confirmed on ${dateStr}${appt.time ? ` at ${appt.time}` : ""}${appt.chamber ? ` at ${appt.chamber}` : ""}. - Dr. Arman Kabir's Care`;
    // Send to doctor
    window.open(
      `https://wa.me/${docNum}?text=${encodeURIComponent(`Appointment confirmed: ${msg}`)}`,
      "_blank",
    );
    // Send to patient if phone available
    const patientPhone = appt.phone?.replace(/[^0-9]/g, "");
    if (patientPhone && patientPhone.length >= 10) {
      setTimeout(
        () =>
          window.open(
            `https://wa.me/${patientPhone}?text=${encodeURIComponent(msg)}`,
            "_blank",
          ),
        800,
      );
    }
    toast.success("WhatsApp confirmation sent");
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = appointments
    .filter((a) => {
      if (filter === "today") return a.date === todayStr;
      if (filter === "upcoming")
        return a.date >= todayStr && a.status !== "cancelled";
      if (filter === "cancelled") return a.status === "cancelled";
      return true;
    })
    .sort((a, b) => {
      const dt = (x: AppointmentEntry) => `${x.date}T${x.time || "00:00"}`;
      return dt(a).localeCompare(dt(b));
    });

  const filterLabels: Record<ApptFilter, string> = {
    all: "All",
    today: "Today",
    upcoming: "Upcoming",
    cancelled: "Cancelled",
  };

  const chamberOptions = form.doctor
    ? CHAMBERS_BY_DOCTOR[form.doctor] || []
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(filterLabels) as ApptFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setFilter(f)}
              data-ocid={`appointments.${f}.tab`}
            >
              {filterLabels[f]}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={openAdd}
          data-ocid="appointments.open_modal_button"
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground"
          data-ocid="appointments.empty_state"
        >
          <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
          <p className="font-medium">No appointments found</p>
          <p className="text-sm mt-1">
            Schedule a new appointment to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((appt, idx) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
                data-ocid={`appointments.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        {appt.patientName}
                      </span>
                      {appt.registerNumber && (
                        <span className="text-xs font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {appt.registerNumber}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={apptStatusConfig[appt.status].className}
                      >
                        {apptStatusConfig[appt.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                      {appt.doctor && (
                        <span className="text-primary font-medium text-xs">
                          {appt.doctor}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        {new Date(appt.date).toLocaleDateString("en-BD", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {appt.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {appt.time}
                        </span>
                      )}
                      {appt.phone && <span>{appt.phone}</span>}
                    </div>
                    {appt.chamber && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        📍 {appt.chamber}
                      </p>
                    )}
                    {appt.reason && (
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                        {appt.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                      title="Send WhatsApp confirmation to patient & doctor"
                      onClick={() => sendWhatsApp(appt)}
                      data-ocid={`appointments.secondary_button.${idx + 1}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(appt)}
                      data-ocid={`appointments.edit_button.${idx + 1}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteAppt(appt.id)}
                      data-ocid={`appointments.delete_button.${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg" data-ocid="appointments.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {editTarget ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Register number lookup */}
            <div className="space-y-1.5">
              <Label>Register Number (returning patients)</Label>
              <div className="relative">
                <Input
                  placeholder="0001/26 — auto-fills patient details"
                  value={regNoInput}
                  onChange={(e) => handleRegNoLookup(e.target.value)}
                  className="pr-8"
                  data-ocid="appointments.input"
                />
                <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
              {regNoMsg && (
                <p
                  className={`text-xs font-medium ${
                    regNoMsg.startsWith("✓")
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {regNoMsg}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Patient Name</Label>
              <PatientSearch
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                onSelect={(name, phone) =>
                  setForm((f) => ({ ...f, name, phone }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                data-ocid="appointments.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preferred Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  data-ocid="appointments.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, time: e.target.value }))
                  }
                  data-ocid="appointments.input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select
                value={form.doctor}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, doctor: v, chamber: "" }))
                }
              >
                <SelectTrigger data-ocid="appointments.select">
                  <SelectValue placeholder="Select doctor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Arman Kabir">
                    Dr. Arman Kabir
                  </SelectItem>
                  <SelectItem value="Dr. Samia Shikder">
                    Dr. Samia Shikder
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {chamberOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label>Preferred Chamber</Label>
                <Select
                  value={form.chamber}
                  onValueChange={(v) => setForm((f) => ({ ...f, chamber: v }))}
                >
                  <SelectTrigger data-ocid="appointments.select">
                    <SelectValue placeholder="Select chamber" />
                  </SelectTrigger>
                  <SelectContent>
                    {chamberOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Reason / Notes</Label>
              <Textarea
                placeholder="Reason for visit or notes…"
                className="resize-none"
                rows={3}
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                data-ocid="appointments.textarea"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as AppointmentStatus }))
                }
              >
                <SelectTrigger data-ocid="appointments.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              data-ocid="appointments.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveAppointment}
              data-ocid="appointments.submit_button"
            >
              {editTarget ? "Save Changes" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Public Booking Requests ─────────────────────────────────────────────────

interface PublicBooking {
  id: string;
  patientName: string;
  phone: string;
  doctor: string;
  date?: string;
  preferredDate?: string;
  preferredTime?: string;
  time?: string;
  reason?: string;
  submittedAt: string;
  status: "pending" | "confirmed" | "cancelled";
  registerNumber?: string;
  chamber?: string;
  preferredChamber?: string;
}

function loadPublicBookings(): PublicBooking[] {
  try {
    return JSON.parse(
      localStorage.getItem("public_appointment_requests") || "[]",
    );
  } catch {
    return [];
  }
}

function savePublicBookings(data: PublicBooking[]) {
  localStorage.setItem("public_appointment_requests", JSON.stringify(data));
}

function PublicBookingRequestsTab() {
  const [bookings, setBookings] = useState<PublicBooking[]>(loadPublicBookings);
  const [confirmingBooking, setConfirmingBooking] =
    useState<PublicBooking | null>(null);
  const createPatient = useCreatePatient();

  const persistBookings = (updated: PublicBooking[]) => {
    setBookings(updated);
    savePublicBookings(updated);
  };

  const markConfirmed = (id: string) => {
    persistBookings(
      bookings.map((b) => (b.id === id ? { ...b, status: "confirmed" } : b)),
    );
  };

  const cancelBooking = (id: string) => {
    persistBookings(
      bookings.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
    );
    toast.success("Booking cancelled.");
  };

  const handlePatientRegister = (data: PatientFormData) => {
    if (!confirmingBooking) return;
    createPatient.mutate(data, {
      onSuccess: () => {
        markConfirmed(confirmingBooking.id);
        toast.success(
          `Appointment confirmed and ${data.fullName} registered as a patient.`,
        );
        setConfirmingBooking(null);
      },
      onError: () => {
        toast.error("Failed to register patient. Please try again.");
      },
    });
  };

  const statusBadge = (status: PublicBooking["status"]) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <>
      {bookings.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
          data-ocid="public_bookings.empty_state"
        >
          <Inbox className="w-10 h-10 opacity-40" />
          <p className="text-sm">No public booking requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4" data-ocid="public_bookings.table">
          <p className="text-sm text-muted-foreground">
            {bookings.length} request{bookings.length !== 1 ? "s" : ""} from the
            public booking form.
          </p>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Chamber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b, idx) => (
                  <TableRow
                    key={b.id}
                    data-ocid={`public_bookings.item.${idx + 1}`}
                  >
                    <TableCell className="font-medium">
                      <div>
                        {b.patientName}
                        {b.registerNumber && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {b.registerNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {b.phone}
                    </TableCell>
                    <TableCell className="text-sm">{b.doctor}</TableCell>
                    <TableCell className="text-sm">
                      {b.preferredDate || b.date || "—"}
                      {(b.preferredTime || b.time) && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {b.preferredTime || b.time}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {b.preferredChamber || b.chamber || "—"}
                    </TableCell>
                    <TableCell>{statusBadge(b.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {b.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 gap-1"
                            onClick={() => setConfirmingBooking(b)}
                            data-ocid={`public_bookings.confirm_button.${idx + 1}`}
                          >
                            <UserPlus className="w-3 h-3" />
                            Confirm
                          </Button>
                        )}
                        {b.status === "confirmed" && (
                          <span className="text-xs text-green-700 font-medium">
                            Registered
                          </span>
                        )}
                        {b.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                            onClick={() => cancelBooking(b.id)}
                            data-ocid={`public_bookings.delete_button.${idx + 1}`}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog
        open={!!confirmingBooking}
        onOpenChange={(open) => {
          if (!open) setConfirmingBooking(null);
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="public_bookings.register_dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Register Patient &amp; Confirm Appointment
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pre-filled from the booking request. Complete the details and save
              to confirm.
            </p>
          </DialogHeader>
          {confirmingBooking && (
            <PatientForm
              prefill={{
                fullName: confirmingBooking.patientName,
                phone: confirmingBooking.phone,
              }}
              onSubmit={handlePatientRegister}
              onCancel={() => setConfirmingBooking(null)}
              isLoading={createPatient.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Appointments() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Appointments
            </h1>
            <p className="text-sm text-muted-foreground">
              Doctor serial, appointment schedule &amp; public booking requests
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="serial" className="space-y-5">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger
            value="serial"
            className="gap-2"
            data-ocid="appointments.serial.tab"
          >
            <ListOrdered className="w-4 h-4" />
            Doctor Serial
          </TabsTrigger>
          <TabsTrigger
            value="appointments"
            className="gap-2"
            data-ocid="appointments.schedule.tab"
          >
            <CalendarDays className="w-4 h-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="gap-2"
            data-ocid="appointments.public.tab"
          >
            <Inbox className="w-4 h-4" />
            Public Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="serial" className="mt-0">
          <DoctorSerialTab />
        </TabsContent>

        <TabsContent value="appointments" className="mt-0">
          <AppointmentsTab />
        </TabsContent>

        <TabsContent value="public" className="mt-0">
          <PublicBookingRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
