import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Droplets,
  Edit,
  FileText,
  Heart,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Scissors,
  Stethoscope,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Prescription, Visit } from "../backend.d";
import NewPrescriptionMode from "../components/NewPrescriptionMode";
import PatientForm from "../components/PatientForm";
import PrescriptionForm from "../components/PrescriptionForm";
import PrescriptionPad from "../components/PrescriptionPad";
import VisitForm from "../components/VisitForm";
import {
  useCreatePrescription,
  useCreateVisit,
  useGetPatient,
  useGetPrescriptionsByPatient,
  useGetVisitsByPatient,
  useUpdatePatient,
} from "../hooks/useQueries";

const VISIT_SKELETON_KEYS = ["vsk1", "vsk2", "vsk3"];
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

function VisitCard({
  visit,
  index,
  onClick,
}: {
  visit: Visit;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-card hover:border-primary/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-ocid={`patient_profile.visits.item.${index + 1}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {visit.chiefComplaint}
            </p>
            <Badge
              variant={visit.visitType === "admitted" ? "default" : "secondary"}
              className="text-xs flex-shrink-0 capitalize"
            >
              {visit.visitType}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(visit.visitDate)}
            </span>
            {visit.diagnosis && (
              <span className="truncate text-primary/80">
                Dx: {visit.diagnosis}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
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
  const [showRxForm, setShowRxForm] = useState(false);
  const [rxInitialDiagnosis, setRxInitialDiagnosis] = useState<
    string | undefined
  >(undefined);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [editRx, setEditRx] = useState<Prescription | null>(null);
  const [showPadPreview, setShowPadPreview] = useState(false);
  const [padPrescription, setPadPrescription] = useState<Prescription | null>(
    null,
  );

  const { data: patient, isLoading: loadingPatient } = useGetPatient(patientId);
  const { data: visits = [], isLoading: loadingVisits } =
    useGetVisitsByPatient(patientId);
  const { data: prescriptions = [], isLoading: loadingRx } =
    useGetPrescriptionsByPatient(patientId);

  const updateMutation = useUpdatePatient();
  const createVisitMutation = useCreateVisit();
  const createRxMutation = useCreatePrescription();

  const openRxForm = (diagnosis?: string) => {
    setRxInitialDiagnosis(diagnosis);
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

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/Patients" })}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
        data-ocid="patient_profile.link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-card"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-bold text-white shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.52 0.14 215))",
            }}
          >
            {patient.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  {patient.fullName}
                </h1>
                {patient.nameBn && (
                  <p className="text-sm text-muted-foreground">
                    {patient.nameBn}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {age !== null && (
                    <Badge variant="secondary">{age} years old</Badge>
                  )}
                  <Badge variant="secondary" className="capitalize">
                    {patient.gender}
                  </Badge>
                  {patient.bloodGroup && patient.bloodGroup !== "unknown" && (
                    <Badge
                      variant="outline"
                      className="border-red-200 text-red-600"
                    >
                      <Droplets className="w-3 h-3 mr-1" />
                      {patient.bloodGroup}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      patient.patientType === "admitted" ? "default" : "outline"
                    }
                    className="capitalize"
                  >
                    {patient.patientType}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={() => setShowEditForm(true)}
                data-ocid="patient_profile.edit_button"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {patient.email}
                </span>
              )}
              {patient.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {patient.address}
                </span>
              )}
            </div>

            {(patient.allergies.length > 0 ||
              patient.chronicConditions.length > 0 ||
              patient.pastSurgicalHistory) && (
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
                {patient.pastSurgicalHistory && (
                  <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1">
                    <Scissors className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                    <span className="text-xs text-purple-700 font-medium">
                      {patient.pastSurgicalHistory}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="visits">
        <TabsList className="mb-4">
          <TabsTrigger value="visits" data-ocid="patient_profile.tab">
            <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
            Visits ({visits.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" data-ocid="patient_profile.tab">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Prescriptions ({prescriptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-3 mt-0">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowVisitForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              data-ocid="patient_profile.visits.open_modal_button"
            >
              <Plus className="w-4 h-4" />
              New Visit
            </Button>
          </div>
          {loadingVisits ? (
            <div
              className="space-y-3"
              data-ocid="patient_profile.visits.loading_state"
            >
              {VISIT_SKELETON_KEYS.map((k) => (
                <Skeleton key={k} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : visits.length === 0 ? (
            <div
              className="text-center py-12"
              data-ocid="patient_profile.visits.empty_state"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No visits recorded yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits
                .slice()
                .sort((a, b) => Number(b.visitDate - a.visitDate))
                .map((visit, idx) => (
                  <VisitCard
                    key={visit.id.toString()}
                    visit={visit}
                    index={idx}
                    onClick={() => setSelectedVisit(visit)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-3 mt-0">
          <div className="flex justify-end">
            <Button
              onClick={() => openRxForm(undefined)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              data-ocid="patient_profile.prescriptions.open_modal_button"
            >
              <Plus className="w-4 h-4" />
              New Prescription
            </Button>
          </div>
          {loadingRx ? (
            <div
              className="space-y-3"
              data-ocid="patient_profile.prescriptions.loading_state"
            >
              {RX_SKELETON_KEYS.map((k) => (
                <Skeleton key={k} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <div
              className="text-center py-12"
              data-ocid="patient_profile.prescriptions.empty_state"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No prescriptions yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {prescriptions
                .slice()
                .sort((a, b) => Number(b.prescriptionDate - a.prescriptionDate))
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
        </TabsContent>
      </Tabs>

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
            <NewPrescriptionMode
              patientId={patientId}
              patientName={patient.fullName}
              initialDiagnosis={rxInitialDiagnosis}
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
