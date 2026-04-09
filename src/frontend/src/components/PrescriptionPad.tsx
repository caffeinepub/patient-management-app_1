import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Edit2, Eye, Printer, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Prescription } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionPadProps {
  prescription?: Prescription | null;
  patientName?: string;
  patientAge?: number | null;
  patientWeight?: string;
  patientHeight?: number | null;
  registerNumber?: string;
  bloodGroup?: string;
  address?: string;
  sex?: string;
  linkedVisitId?: string;
  patientId?: bigint | null;
}

interface RxDrug {
  drugForm?: string;
  drugName?: string;
  brandName?: string;
  dose?: string;
  frequency?: string;
  frequencyBn?: string;
  duration?: string;
  durationBn?: string;
  instructions?: string;
  instructionBn?: string;
  specialInstruction?: string;
  specialInstructionBn?: string;
  routeBn?: string;
  route?: string;
  name?: string;
}

interface ClinicalSnapshot {
  cc?: string;
  pmh?: string;
  dh?: string;
  oe?: string;
  historyPersonal?: string;
  historyFamily?: string;
  historyImmunization?: string;
  historyAllergy?: string;
  historyOthers?: string;
  investigation?: string;
  adviceNewInv?: string;
  adviceText?: string;
  bloodGroup?: string;
  address?: string;
  sex?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSnapshot(notes?: string): ClinicalSnapshot {
  if (!notes) return {};
  try {
    return JSON.parse(notes) as ClinicalSnapshot;
  } catch {
    return { adviceText: notes };
  }
}

// biome-ignore lint/suspicious/noExplicitAny: normalization helper
function normalizeDrug(m: any): RxDrug {
  return {
    drugForm: m.drugForm || m.form || "",
    drugName: m.drugName || m.name || "",
    brandName: m.brandName || "",
    dose: m.dose || "",
    frequency: m.frequency || "",
    frequencyBn: m.frequencyBn || "",
    duration: m.duration || "",
    durationBn: m.durationBn || "",
    instructions: m.instructions || "",
    instructionBn: m.instructionBn || "",
    specialInstruction: m.specialInstruction || "",
    specialInstructionBn: m.specialInstructionBn || "",
    routeBn: m.routeBn || "",
    route: m.route || "",
  };
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printElement(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Prescription</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, serif; font-size: 11pt; margin: 15mm; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .grid { display: grid !important; }
    .grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
    .col-span-2 { grid-column: span 2 / span 2 !important; }
    .col-span-3 { grid-column: span 3 / span 3 !important; }
    .gap-3 { gap: 0.75rem !important; }
    .flex { display: flex !important; }
    .flex-wrap { flex-wrap: wrap !important; }
    .justify-between { justify-content: space-between !important; }
    .items-start { align-items: flex-start !important; }
    .gap-x-3 { column-gap: 0.75rem !important; }
    .space-y-2 > * + * { margin-top: 0.5rem !important; }
    .mb-1 { margin-bottom: 0.25rem !important; }
    .mb-2 { margin-bottom: 0.5rem !important; }
    .mb-3 { margin-bottom: 0.75rem !important; }
    .mt-3 { margin-top: 0.75rem !important; }
    .mt-8 { margin-top: 2rem !important; }
    .pb-2 { padding-bottom: 0.5rem !important; }
    .pt-1 { padding-top: 0.25rem !important; }
    .pt-2 { padding-top: 0.5rem !important; }
    .pl-4 { padding-left: 1rem !important; }
    .pr-2 { padding-right: 0.5rem !important; }
    .p-4 { padding: 1rem !important; }
    .border-b { border-bottom: 1px solid #d1d5db !important; }
    .border-t { border-top: 1px solid #d1d5db !important; }
    .border-r { border-right: 1px solid #d1d5db !important; }
    .border { border: 1px solid #d1d5db !important; }
    .font-serif { font-family: Georgia, serif !important; }
    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .text-base { font-size: 1rem !important; }
    .text-sm { font-size: 0.875rem !important; }
    .text-xs { font-size: 0.75rem !important; }
    .text-2xl { font-size: 1.5rem !important; }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .uppercase { text-transform: uppercase !important; }
    .whitespace-pre-wrap { white-space: pre-wrap !important; }
    .leading-snug { line-height: 1.375 !important; }
    .text-gray-900 { color: #111827 !important; }
    .text-gray-600 { color: #4b5563 !important; }
    .text-gray-500 { color: #6b7280 !important; }
    .text-gray-400 { color: #9ca3af !important; }
    .text-indigo-600 { color: #4f46e5 !important; }
    .text-orange-600 { color: #ea580c !important; }
    .text-teal-600 { color: #0d9488 !important; }
    .text-blue-600 { color: #2563eb !important; }
    .text-green-600 { color: #16a34a !important; }
    .text-purple-600 { color: #9333ea !important; }
    .text-amber-600 { color: #d97706 !important; }
    .text-rose-600 { color: #e11d48 !important; }
    strong { font-weight: 700 !important; }
    .inline-block { display: inline-block !important; }
    .min-w-\\[140px\\] { min-width: 140px !important; }
    @media print {
      body { margin: 10mm; }
      .no-print { display: none !important; }
    }
  </style></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrescriptionPad({
  prescription,
  patientName,
  patientAge,
  patientWeight,
  registerNumber,
  bloodGroup,
  address,
  sex,
  linkedVisitId,
  patientId,
}: PrescriptionPadProps) {
  const [editMode, setEditMode] = useState(false);
  const [withHeader, setWithHeader] = useState(true);

  const rxId =
    prescription?.id !== undefined ? String(prescription.id) : "blank";
  const padStorageKey = `rx_pad_preview_edits_${rxId}`;

  const snapshot = extractSnapshot(prescription?.notes);

  // All editable fields
  const [name, setName] = useState(patientName || "");
  const [age, setAge] = useState(patientAge != null ? String(patientAge) : "");
  const [weightVal, setWeightVal] = useState(patientWeight || "");
  const [regNo, setRegNo] = useState(registerNumber || "");
  const [bg, setBg] = useState(bloodGroup || snapshot.bloodGroup || "");
  const [addr, setAddr] = useState(address || snapshot.address || "");
  const [sexVal, setSexVal] = useState(sex || snapshot.sex || "");
  const [rxDate, setRxDate] = useState(
    prescription?.prescriptionDate
      ? new Date(
          Number(prescription.prescriptionDate / 1000000n),
        ).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
  );
  const [diagnosisVal, setDiagnosisVal] = useState(
    prescription?.diagnosis || "",
  );
  const [cc, setCc] = useState(snapshot.cc || "");
  const [pmh, setPmh] = useState(snapshot.pmh || "");
  const [dh, setDh] = useState(snapshot.dh || "");
  const [oe, setOe] = useState(snapshot.oe || "");
  const [historyPersonal, setHistoryPersonal] = useState(
    snapshot.historyPersonal || "",
  );
  const [historyFamily, setHistoryFamily] = useState(
    snapshot.historyFamily || "",
  );
  const [historyImmunization, setHistoryImmunization] = useState(
    snapshot.historyImmunization || "",
  );
  const [historyAllergy, setHistoryAllergy] = useState(
    snapshot.historyAllergy || "",
  );
  const [historyOthers, setHistoryOthers] = useState(
    snapshot.historyOthers || "",
  );
  const [investigation, setInvestigation] = useState(
    snapshot.investigation || "",
  );
  const [adviceNewInv, setAdviceNewInv] = useState(snapshot.adviceNewInv || "");
  const [adviceText, setAdviceText] = useState(snapshot.adviceText || "");
  const drugs: RxDrug[] = (prescription?.medications || []).map(normalizeDrug);

  // Load saved pad edits from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(padStorageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.cc !== undefined) setCc(data.cc);
        if (data.pmh !== undefined) setPmh(data.pmh);
        if (data.dh !== undefined) setDh(data.dh);
        if (data.oe !== undefined) setOe(data.oe);
        if (data.investigation !== undefined)
          setInvestigation(data.investigation);
        if (data.adviceText !== undefined) setAdviceText(data.adviceText);
        if (data.diagnosisVal !== undefined) setDiagnosisVal(data.diagnosisVal);
      }
    } catch {
      // ignore
    }
  }, [padStorageKey]);

  // If visit data available, try to enrich from it
  useEffect(() => {
    if (!linkedVisitId) return;
    const allKeys = Object.keys(localStorage);
    const matchKey = allKeys.find((k) =>
      k.includes(`visit_form_data_${linkedVisitId}`),
    );
    if (!matchKey) return;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: visit form data is dynamic
      const vd = JSON.parse(localStorage.getItem(matchKey) || "null") as Record<
        string,
        any
      > | null;
      if (!vd) return;
      // Only fill if not already populated from snapshot
      if (!cc && vd.chiefComplaints?.length) {
        const complaints: string[] = vd.chiefComplaints;
        const answers: Record<
          string,
          Record<string, string>
        > = vd.complaintAnswers || {};
        const lines = complaints.map((c: string, i: number) => {
          const ans = answers[c];
          const vals = ans ? Object.values(ans).filter(Boolean) : [];
          return vals.length
            ? `${i + 1}. ${c} — ${vals.join(", ")}`
            : `${i + 1}. ${c}`;
        });
        setCc(lines.join("\n"));
      }
    } catch {
      // ignore
    }
  }, [linkedVisitId, cc]);

  const savePad = () => {
    try {
      localStorage.setItem(
        padStorageKey,
        JSON.stringify({
          cc,
          pmh,
          dh,
          oe,
          investigation,
          adviceText,
          diagnosisVal,
        }),
      );
      // Save metadata for patient profile download
      if (patientId) {
        const key = `savedPrescriptionPads_${patientId}`;
        const existing = (() => {
          try {
            return JSON.parse(localStorage.getItem(key) || "[]");
          } catch {
            return [];
          }
        })();
        const meta = {
          id: `pad_${Date.now()}`,
          patientId: String(patientId),
          prescriptionId: rxId,
          date: new Date().toLocaleDateString("en-GB"),
          timestamp: new Date().toISOString(),
          patientName: name,
          diagnosis: diagnosisVal,
          medications: prescription?.medications ?? [],
        };
        existing.push(meta);
        localStorage.setItem(key, JSON.stringify(existing));
      }
      toast.success("Prescription pad saved");
      setEditMode(false);
    } catch {
      toast.error("Failed to save");
    }
  };

  const hasHistory =
    historyPersonal ||
    historyFamily ||
    historyImmunization ||
    historyAllergy ||
    historyOthers;

  const printId = "rx-pad-2col-print";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 bg-muted/40 border rounded-xl p-3"
        data-ocid="prescription_pad.panel"
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditMode((v) => !v)}
          className={`gap-1.5 ${editMode ? "bg-amber-50 border-amber-300 text-amber-700" : "border-border"}`}
          data-ocid="prescription_pad.edit_button"
        >
          {editMode ? (
            <>
              <Save className="w-3.5 h-3.5" /> Save & View
            </>
          ) : (
            <>
              <Edit2 className="w-3.5 h-3.5" /> Edit Mode
            </>
          )}
        </Button>
        {editMode && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={savePad}
            className="gap-1.5 border-green-400 text-green-700 hover:bg-green-50"
            data-ocid="prescription_pad.save_button"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={`gap-1.5 ${withHeader ? "bg-teal-50 border-teal-300 text-teal-700" : "border-border text-muted-foreground"}`}
          onClick={() => setWithHeader((v) => !v)}
          data-ocid="prescription_pad.toggle"
        >
          {withHeader ? "With Header" : "Without Header"}
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => printElement(printId)}
          className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50"
          data-ocid="prescription_pad.primary_button"
        >
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => printElement(printId)}
          className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          data-ocid="prescription_pad.secondary_button"
        >
          <Download className="w-4 h-4" /> Save PDF
        </Button>
      </div>

      {/* Edit mode shows patient info inputs */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {(
            [
              ["Name", name, setName],
              ["Age (yrs)", age, setAge],
              ["Sex", sexVal, setSexVal],
              ["Weight (kg)", weightVal, setWeightVal],
              ["Blood Group", bg, setBg],
              ["Reg No", regNo, setRegNo],
              ["Date", rxDate, setRxDate],
            ] as [string, string, (v: string) => void][]
          ).map(([label, val, setter]) => (
            <div key={label}>
              <Label className="text-xs text-blue-700 font-semibold">
                {label}
              </Label>
              <input
                value={val}
                onChange={(e) => setter(e.target.value)}
                className="w-full border border-blue-200 rounded px-2 py-1 text-xs mt-0.5 bg-white"
              />
            </div>
          ))}
          <div className="col-span-2">
            <Label className="text-xs text-blue-700 font-semibold">
              Address
            </Label>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              className="w-full border border-blue-200 rounded px-2 py-1 text-xs mt-0.5 bg-white"
            />
          </div>
        </div>
      )}

      {/* The printable 2-column prescription */}
      <div
        id={printId}
        className="font-serif text-gray-900 border border-gray-200 p-4 rounded bg-white"
      >
        {/* Header */}
        {withHeader && (
          <div className="border-b pb-2 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-base">Dr. Arman Kabir (ZOSID)</h2>
                <p className="text-sm text-gray-600">
                  MBBS (D.U.) | Emergency Medical Officer
                </p>
                <p className="text-sm text-gray-600">
                  Dr. Sirajul Islam Medical College Hospital
                </p>
                <p className="text-sm text-gray-600">
                  Registrar, Dept. of General Surgery uDC
                </p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Reg. no. A-105224</p>
                <p>Mob: 01751959262 / 01984587802</p>
              </div>
            </div>
          </div>
        )}

        {/* Patient info line */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm border-b pb-2 mb-3">
          {name && (
            <span>
              <strong>Name:</strong> {name}
            </span>
          )}
          {age && (
            <span>
              <strong>Age:</strong> {age} <strong>yrs</strong>
            </span>
          )}
          {sexVal && (
            <span>
              <strong>Sex:</strong> {sexVal}
            </span>
          )}
          {weightVal && (
            <span>
              <strong>Weight:</strong> {weightVal} <strong>kg</strong>
            </span>
          )}
          {bg && (
            <span>
              <strong>Blood Group:</strong> {bg}
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
          {addr && (
            <span>
              <strong>Address:</strong> {addr}
            </span>
          )}
        </div>

        {/* 2-column body */}
        <div className="grid grid-cols-5 gap-3">
          {/* LEFT: Clinical Summary */}
          <div className="col-span-2 space-y-2 text-sm border-r pr-2">
            {(cc || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-blue-600 mb-0.5">
                  C/C
                </div>
                {editMode ? (
                  <Textarea
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">{cc}</div>
                )}
              </div>
            )}
            {(pmh || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-green-600 mb-0.5">
                  P/M/H
                </div>
                {editMode ? (
                  <Textarea
                    value={pmh}
                    onChange={(e) => setPmh(e.target.value)}
                    className="text-xs min-h-[50px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">{pmh}</div>
                )}
              </div>
            )}
            {(hasHistory || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-purple-600 mb-0.5">
                  History
                </div>
                {editMode ? (
                  <div className="space-y-1">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Personal
                      </Label>
                      <Textarea
                        value={historyPersonal}
                        onChange={(e) => setHistoryPersonal(e.target.value)}
                        className="text-xs min-h-[30px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Family
                      </Label>
                      <Textarea
                        value={historyFamily}
                        onChange={(e) => setHistoryFamily(e.target.value)}
                        className="text-xs min-h-[30px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Immunization
                      </Label>
                      <Textarea
                        value={historyImmunization}
                        onChange={(e) => setHistoryImmunization(e.target.value)}
                        className="text-xs min-h-[30px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Allergy
                      </Label>
                      <Textarea
                        value={historyAllergy}
                        onChange={(e) => setHistoryAllergy(e.target.value)}
                        className="text-xs min-h-[30px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Others
                      </Label>
                      <Textarea
                        value={historyOthers}
                        onChange={(e) => setHistoryOthers(e.target.value)}
                        className="text-xs min-h-[30px] resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs space-y-0.5">
                    {historyPersonal && (
                      <div>
                        <span className="font-semibold">Personal: </span>
                        {historyPersonal}
                      </div>
                    )}
                    {historyFamily && (
                      <div>
                        <span className="font-semibold">Family: </span>
                        {historyFamily}
                      </div>
                    )}
                    {historyImmunization && (
                      <div>
                        <span className="font-semibold">Immunization: </span>
                        {historyImmunization}
                      </div>
                    )}
                    {historyAllergy && (
                      <div>
                        <span className="font-semibold">Allergy: </span>
                        {historyAllergy}
                      </div>
                    )}
                    {historyOthers && (
                      <div>
                        <span className="font-semibold">Others: </span>
                        {historyOthers}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {(dh || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-amber-600 mb-0.5">
                  D/H
                </div>
                {editMode ? (
                  <Textarea
                    value={dh}
                    onChange={(e) => setDh(e.target.value)}
                    className="text-xs min-h-[50px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">{dh}</div>
                )}
              </div>
            )}
            {(oe || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-rose-600 mb-0.5">
                  O/E
                </div>
                {editMode ? (
                  <Textarea
                    value={oe}
                    onChange={(e) => setOe(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">{oe}</div>
                )}
              </div>
            )}
            {(investigation || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-teal-600 mb-0.5">
                  Investigation
                </div>
                {editMode ? (
                  <Textarea
                    value={investigation}
                    onChange={(e) => setInvestigation(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">
                    {investigation}
                  </div>
                )}
              </div>
            )}
            {(adviceNewInv || editMode) && (
              <div>
                <div className="font-bold text-xs uppercase text-orange-600 mb-0.5">
                  Advice / New Inv.
                </div>
                {editMode ? (
                  <Textarea
                    value={adviceNewInv}
                    onChange={(e) => setAdviceNewInv(e.target.value)}
                    className="text-xs min-h-[50px] resize-none"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">
                    {adviceNewInv}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Rx */}
          <div className="col-span-3">
            {(diagnosisVal || editMode) && (
              <div className="mb-2">
                <span className="font-bold text-sm">Dx: </span>
                {editMode ? (
                  <input
                    value={diagnosisVal}
                    onChange={(e) => setDiagnosisVal(e.target.value)}
                    className="border-b border-gray-300 text-sm ml-1 outline-none w-full mt-1"
                  />
                ) : (
                  <span className="text-sm">{diagnosisVal}</span>
                )}
              </div>
            )}
            <div className="text-2xl font-bold mb-2">&#8477;</div>

            {drugs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No medications added.
              </p>
            ) : (
              <div className="space-y-2">
                {drugs.map((d, i) => (
                  <div key={`drug-${d.drugName}-${i}`} className="leading-snug">
                    {/* Line 1 */}
                    <div className="text-sm font-medium">
                      {i + 1}.{" "}
                      <span className="text-indigo-600">{d.drugForm}</span>{" "}
                      {d.brandName ? (
                        <>
                          <strong>{d.brandName}</strong>
                          {d.drugName && (
                            <span className="text-gray-400 text-xs ml-1">
                              ({d.drugName})
                            </span>
                          )}
                        </>
                      ) : (
                        d.drugName || d.name
                      )}{" "}
                      <span>{d.dose}</span>
                    </div>
                    {/* Line 2 */}
                    <div className="text-xs text-gray-500 pl-4">
                      {[
                        d.frequencyBn || d.frequency,
                        d.durationBn || d.duration
                          ? `– ${d.durationBn || d.duration}`
                          : "",
                        d.instructionBn || d.instructions,
                      ]
                        .filter(Boolean)
                        .join("  ")}
                      {(d.specialInstructionBn || d.specialInstruction) && (
                        <span className="text-orange-600 ml-1">
                          · {d.specialInstructionBn || d.specialInstruction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Advice */}
            {(adviceText || editMode) && (
              <div className="mt-3 pt-2 border-t">
                <div className="font-bold text-xs uppercase text-gray-500 mb-1">
                  পরামর্শ
                </div>
                {editMode ? (
                  <Textarea
                    value={adviceText}
                    onChange={(e) => setAdviceText(e.target.value)}
                    className="text-xs min-h-[60px] resize-none"
                    placeholder="Bengali advice..."
                  />
                ) : (
                  <div className="text-xs whitespace-pre-wrap">
                    {adviceText}
                  </div>
                )}
              </div>
            )}

            {/* Doctor Signature */}
            <div className="mt-8 pt-4 text-right">
              <div className="inline-block text-center">
                <div className="border-t border-gray-500 pt-1 min-w-[140px]">
                  <p className="text-xs text-gray-600 font-semibold">
                    Doctor's Signature
                  </p>
                  <p className="text-xs text-gray-500">
                    Dr. Arman Kabir (ZOSID)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
