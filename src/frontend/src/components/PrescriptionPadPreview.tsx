import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Download, Edit2, Eye, Printer } from "lucide-react";
import { useState } from "react";
import type { Prescription } from "../backend.d";

interface RxDrug {
  id?: string;
  drugForm?: string;
  route?: string;
  routeBn?: string;
  drugName?: string;
  brandName?: string;
  nameType?: "brand" | "generic";
  dose?: string;
  duration?: string;
  durationBn?: string;
  instructions?: string;
  instructionBn?: string;
  frequency?: string;
  frequencyBn?: string;
  specialInstruction?: string;
  specialInstructionBn?: string;
  // legacy fields from saved prescriptions
  name?: string;
  form?: string;
}

interface ClinicalSummary {
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
  diagnosis?: string;
}

interface Props {
  prescription: Prescription | null;
  patientName?: string;
  patientAge?: number;
  patientWeight?: string;
  registerNumber?: string;
  patientId?: bigint;
}

function extractClinicalSummary(notes?: string): ClinicalSummary {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed as ClinicalSummary;
  } catch {
    // notes is plain text
    return { adviceText: notes };
  }
}

function normalizeDrug(m: any): RxDrug {
  return {
    id: m.id || String(Math.random()),
    drugForm: m.drugForm || m.form || "",
    route: m.route || "",
    routeBn: m.routeBn || "",
    drugName: m.drugName || m.name || "",
    brandName: m.brandName || "",
    nameType: m.nameType || "generic",
    dose: m.dose || "",
    duration: m.duration || "",
    durationBn: m.durationBn || "",
    instructions: m.instructions || "",
    instructionBn: m.instructionBn || "",
    frequency: m.frequency || "",
    frequencyBn: m.frequencyBn || "",
    specialInstruction: m.specialInstruction || "",
    specialInstructionBn: m.specialInstructionBn || "",
  };
}

export default function PrescriptionPadPreview({
  prescription,
  patientName,
  patientAge,
  patientWeight,
  registerNumber,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [withHeader, setWithHeader] = useState(true);

  // Extract clinical summary from notes
  const raw = extractClinicalSummary(prescription?.notes);

  // Editable state for all fields
  const [name, setName] = useState(patientName || "");
  const [age, setAge] = useState(patientAge ? String(patientAge) : "");
  const [weight, setWeight] = useState(patientWeight || "");
  const [regNo, setRegNo] = useState(registerNumber || "");
  const [rxDate, setRxDate] = useState(
    prescription?.prescriptionDate
      ? format(
          new Date(Number(prescription.prescriptionDate / 1000000n)),
          "MMM d, yyyy",
        )
      : format(new Date(), "MMM d, yyyy"),
  );
  const [diagnosis, setDiagnosis] = useState(
    raw.diagnosis || prescription?.diagnosis || "",
  );
  const [cc, setCc] = useState(raw.cc || "");
  const [pmh, setPmh] = useState(raw.pmh || "");
  const [dh, setDh] = useState(raw.dh || "");
  const [oe, setOe] = useState(raw.oe || "");
  const [historyPersonal, setHistoryPersonal] = useState(
    raw.historyPersonal || "",
  );
  const [historyFamily, setHistoryFamily] = useState(raw.historyFamily || "");
  const [historyImmunization, setHistoryImmunization] = useState(
    raw.historyImmunization || "",
  );
  const [historyAllergy, setHistoryAllergy] = useState(
    raw.historyAllergy || "",
  );
  const [historyOthers, setHistoryOthers] = useState(raw.historyOthers || "");
  const [investigation, setInvestigation] = useState(raw.investigation || "");
  const [adviceNewInv, setAdviceNewInv] = useState(raw.adviceNewInv || "");
  const [adviceText, setAdviceText] = useState(raw.adviceText || "");

  // Drugs - editable
  const [drugs, setDrugs] = useState<RxDrug[]>(
    (prescription?.medications || []).map(normalizeDrug),
  );

  const hasHistory =
    historyPersonal ||
    historyFamily ||
    historyImmunization ||
    historyAllergy ||
    historyOthers;

  function handlePrint(saveAsPdf = false) {
    const printId = "rx-pad-preview-print";
    const el = document.getElementById(printId);
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Prescription</title>
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
        .items-start { align-items: flex-start !important; }
        .justify-between { justify-content: space-between !important; }
        .gap-x-4 { column-gap: 1rem !important; }
        .space-y-2 > * + * { margin-top: 0.5rem !important; }
        .space-y-1 > * + * { margin-top: 0.25rem !important; }
        .mb-1 { margin-bottom: 0.25rem !important; }
        .mb-2 { margin-bottom: 0.5rem !important; }
        .mb-3 { margin-bottom: 0.75rem !important; }
        .mt-3 { margin-top: 0.75rem !important; }
        .pb-2 { padding-bottom: 0.5rem !important; }
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
        .font-medium { font-weight: 500 !important; }
        .font-semibold { font-weight: 600 !important; }
        .text-base { font-size: 1rem !important; }
        .text-sm { font-size: 0.875rem !important; }
        .text-xs { font-size: 0.75rem !important; }
        .text-2xl { font-size: 1.5rem !important; }
        .uppercase { text-transform: uppercase !important; }
        .whitespace-pre-wrap { white-space: pre-wrap !important; }
        .leading-snug { line-height: 1.375 !important; }
        .text-gray-900 { color: #111827 !important; }
        .text-gray-800 { color: #1f2937 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }
        .text-indigo-600 { color: #4f46e5 !important; }
        .text-orange-600 { color: #ea580c !important; }
        .text-teal-600 { color: #0d9488 !important; }
        .text-right { text-align: right !important; }
        .rounded { border-radius: 0.25rem !important; }
        .max-w-2xl { max-width: 42rem !important; }
        .mx-auto { margin-left: auto !important; margin-right: auto !important; }
        .ml-1 { margin-left: 0.25rem !important; }
        strong { font-weight: 700 !important; }
        @media print {
          body { margin: 10mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style></head><body>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    if (saveAsPdf) {
      win.onafterprint = () => win.close();
    }
    win.focus();
    win.print();
  }

  function updateDrug(index: number, field: keyof RxDrug, value: string) {
    setDrugs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
        <Button
          size="sm"
          variant="outline"
          className={`gap-1.5 ${editMode ? "bg-amber-50 border-amber-300 text-amber-700" : "border-gray-300 text-gray-700"}`}
          onClick={() => setEditMode((v) => !v)}
          data-ocid="rx_pad.toggle"
        >
          {editMode ? (
            <>
              <Eye className="w-3.5 h-3.5" /> View Mode
            </>
          ) : (
            <>
              <Edit2 className="w-3.5 h-3.5" /> Edit Mode
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`gap-1.5 ${
            withHeader
              ? "bg-teal-50 border-teal-300 text-teal-700"
              : "border-gray-300 text-gray-500"
          }`}
          onClick={() => setWithHeader((v) => !v)}
          data-ocid="rx_pad.toggle"
        >
          {withHeader ? "With Header" : "Without Header"}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50"
          onClick={() => handlePrint()}
          data-ocid="rx_pad.button"
        >
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          onClick={() => handlePrint(true)}
          data-ocid="rx_pad.button"
        >
          <Download className="w-3.5 h-3.5" /> Save PDF
        </Button>
      </div>

      {/* Patient Info Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        {editMode ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <Label className="text-xs text-blue-700 font-semibold">
                Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs text-blue-700 font-semibold">Age</Label>
              <Input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs text-blue-700 font-semibold">
                Weight
              </Label>
              <Input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs text-blue-700 font-semibold">
                Reg No
              </Label>
              <Input
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs text-blue-700 font-semibold">
                Date
              </Label>
              <Input
                value={rxDate}
                onChange={(e) => setRxDate(e.target.value)}
                className="h-7 text-sm mt-0.5"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
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
        )}
      </div>

      {/* Print target */}
      <div
        id="rx-pad-preview-print"
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
                  সেন্চুরি আর্কেড মার্কেট, মগবাজার, ঢাকা
                </p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Reg. no. A-105224</p>
                <p>Mob: 01751959262</p>
              </div>
            </div>
          </div>
        )}

        {/* Patient info line */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm border-b pb-2 mb-3">
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

        {/* 2-column layout */}
        <div className="grid grid-cols-5 gap-3">
          {/* Left: clinical summary */}
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
                    placeholder="Chief Complaints..."
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
                    className="text-xs min-h-[60px] resize-none"
                    placeholder="Past Medical/Surgical History..."
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
                      <Label className="text-xs text-gray-500">Personal</Label>
                      <Textarea
                        value={historyPersonal}
                        onChange={(e) => setHistoryPersonal(e.target.value)}
                        className="text-xs min-h-[40px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Family</Label>
                      <Textarea
                        value={historyFamily}
                        onChange={(e) => setHistoryFamily(e.target.value)}
                        className="text-xs min-h-[40px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        Immunization
                      </Label>
                      <Textarea
                        value={historyImmunization}
                        onChange={(e) => setHistoryImmunization(e.target.value)}
                        className="text-xs min-h-[40px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Allergy</Label>
                      <Textarea
                        value={historyAllergy}
                        onChange={(e) => setHistoryAllergy(e.target.value)}
                        className="text-xs min-h-[40px] resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Others</Label>
                      <Textarea
                        value={historyOthers}
                        onChange={(e) => setHistoryOthers(e.target.value)}
                        className="text-xs min-h-[40px] resize-none"
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
                    className="text-xs min-h-[60px] resize-none"
                    placeholder="Drug History..."
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
                    placeholder="On Examination..."
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
                    placeholder="Investigation Reports..."
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
                    className="text-xs min-h-[60px] resize-none"
                    placeholder="Advice / New Investigation..."
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-xs">
                    {adviceNewInv}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Rx */}
          <div className="col-span-3">
            {(diagnosis || editMode) && (
              <div className="mb-2">
                <span className="font-bold text-sm">Dx: </span>
                {editMode ? (
                  <input
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="border-b border-gray-300 text-sm ml-1 outline-none flex-1 w-full mt-1"
                    placeholder="Diagnosis..."
                  />
                ) : (
                  <span className="text-sm">{diagnosis}</span>
                )}
              </div>
            )}
            <div className="text-2xl font-bold mb-2">&#8477;</div>

            {/* Drug table in edit mode */}
            {editMode && drugs.length > 0 && (
              <div className="mb-3 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        #
                      </th>
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        Form
                      </th>
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        Drug Name
                      </th>
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        Dose
                      </th>
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        Freq.
                      </th>
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        Duration
                      </th>
                      <th className="border border-gray-200 px-1 py-1 text-left">
                        Instructions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {drugs.map((d, i) => (
                      <tr key={d.id || i}>
                        <td className="border border-gray-200 px-1 py-1">
                          {i + 1}
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <input
                            value={d.drugForm || ""}
                            onChange={(e) =>
                              updateDrug(i, "drugForm", e.target.value)
                            }
                            className="w-12 outline-none border-b border-gray-300"
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <input
                            value={d.drugName || ""}
                            onChange={(e) =>
                              updateDrug(i, "drugName", e.target.value)
                            }
                            className="w-28 outline-none border-b border-gray-300"
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <input
                            value={d.dose || ""}
                            onChange={(e) =>
                              updateDrug(i, "dose", e.target.value)
                            }
                            className="w-16 outline-none border-b border-gray-300"
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <input
                            value={d.frequency || ""}
                            onChange={(e) =>
                              updateDrug(i, "frequency", e.target.value)
                            }
                            className="w-20 outline-none border-b border-gray-300"
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <input
                            value={d.duration || ""}
                            onChange={(e) =>
                              updateDrug(i, "duration", e.target.value)
                            }
                            className="w-16 outline-none border-b border-gray-300"
                          />
                        </td>
                        <td className="border border-gray-200 px-1 py-1">
                          <input
                            value={d.instructions || ""}
                            onChange={(e) =>
                              updateDrug(i, "instructions", e.target.value)
                            }
                            className="w-24 outline-none border-b border-gray-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Drug list in view mode (2-line format) */}
            {!editMode &&
              (drugs.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No medications added.
                </p>
              ) : (
                <div className="space-y-2">
                  {drugs.map((d, i) => (
                    <div key={d.id || i} className="leading-snug">
                      {/* Line 1: form + drug name + dose */}
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
                        ) : d.nameType === "brand" ? (
                          <strong>{d.drugName}</strong>
                        ) : (
                          d.drugName
                        )}{" "}
                        <span>{d.dose}</span>
                      </div>
                      {/* Line 2: frequency, duration, instructions */}
                      <div className="text-xs text-gray-500 pl-4">
                        {[
                          d.frequencyBn || d.frequency,
                          d.durationBn || d.duration
                            ? `–${d.durationBn || d.duration}`
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
              ))}

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
                    placeholder="Advice in Bengali..."
                  />
                ) : (
                  <div className="text-xs whitespace-pre-wrap">
                    {adviceText}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
