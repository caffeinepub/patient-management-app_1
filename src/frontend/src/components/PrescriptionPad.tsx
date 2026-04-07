import { Button } from "@/components/ui/button";
import { doctors } from "@/data/doctorsData";
import { Pencil, Printer, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Prescription } from "../types";

interface PrescriptionPadProps {
  prescription?: Prescription | null;
  patientName?: string;
  patientAge?: number | null;
  patientWeight?: string;
  registerNumber?: string;
  chiefComplaints?: string;
  investigations?: string;
  drugHistory?: string;
  vitalSigns?: {
    temperature?: string;
    bloodPressure?: string;
    pulse?: string;
    oxygenSaturation?: string;
  };
  generalExam?: {
    anemia?: string;
    jaundice?: string;
  };
  nextVisitDate?: string;
  linkedVisitId?: string;
  patientId?: bigint | null;
}

type PadSize = "A4" | "A5";

function BlankLine({ width = "100%" }: { width?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        borderBottom: "1px solid #555",
        width,
        verticalAlign: "bottom",
        minHeight: "1em",
      }}
    />
  );
}

function ConditionBox({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        marginRight: "8px",
        fontSize: "9px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          border: "1px solid #333",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

interface EditableSpanProps {
  fieldKey: string;
  value: string;
  editMode: boolean;
  editedFields: Record<string, string>;
  onFieldChange: (key: string, val: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
}

function EditableSpan({
  fieldKey,
  value,
  editMode,
  editedFields,
  onFieldChange,
  style,
  placeholder = "...",
}: EditableSpanProps) {
  const displayed = editedFields[fieldKey] ?? value;
  return (
    <span
      contentEditable={editMode}
      suppressContentEditableWarning
      onBlur={(e) => onFieldChange(fieldKey, e.currentTarget.textContent || "")}
      data-placeholder={placeholder}
      style={{
        outline: editMode ? "1px dashed #f59e0b" : "none",
        minWidth: "40px",
        display: "inline-block",
        borderBottom: "1px solid #555",
        paddingRight: "4px",
        background: editMode ? "#fffbeb" : "transparent",
        cursor: editMode ? "text" : "default",
        ...style,
      }}
    >
      {displayed || (editMode ? placeholder : "")}
    </span>
  );
}

// ─── Visit data helpers ────────────────────────────────────────────────────

function buildCCText(vd: any): string {
  if (!vd) return "";
  const lines: string[] = [];
  const complaints: string[] = vd.chiefComplaints || [];
  if (complaints.length > 0) {
    lines.push(`Chief Complaints: ${complaints.join(", ")}`);
    const answers: Record<
      string,
      Record<string, string>
    > = vd.complaintAnswers || {};
    for (const complaint of complaints) {
      const qas = answers[complaint];
      if (qas && Object.keys(qas).length > 0) {
        const parts = Object.entries(qas)
          .filter(([, v]) => v)
          .map(([q, a]) => `${q}: ${a}`);
        if (parts.length > 0) lines.push(`• ${complaint}: ${parts.join("; ")}`);
      }
    }
  }
  const sysReview: Record<string, string[]> = vd.systemReviewAnswers || {};
  const positiveSymptoms: string[] = [];
  for (const [, symptoms] of Object.entries(sysReview)) {
    for (const s of symptoms as string[]) {
      if (s) positiveSymptoms.push(s);
    }
  }
  if (positiveSymptoms.length > 0) {
    lines.push(`System Review (+): ${positiveSymptoms.join(", ")}`);
  }
  return lines.join("\n");
}

function buildPMHText(vd: any): string {
  if (!vd) return "";
  const lines: string[] = [];
  const pmh: string[] = vd.pastMedicalHistory || [];
  if (pmh.length > 0) lines.push(`PMH: ${pmh.join(", ")}`);
  const drugs: Array<{ name: string; dose?: string; duration?: string }> =
    vd.drugHistory || [];
  const drugFiltered = drugs.filter((d) => d.name?.trim());
  if (drugFiltered.length > 0) {
    const drugStr = drugFiltered
      .map(
        (d) =>
          `${d.name}${d.dose ? ` ${d.dose}` : ""}${d.duration ? ` (${d.duration})` : ""}`,
      )
      .join(", ");
    lines.push(`Drug History: ${drugStr}`);
  }
  const surgical: string[] = (vd.surgicalHistory || []).filter(Boolean);
  if (surgical.length > 0)
    lines.push(`Surgical History: ${surgical.join(", ")}`);
  const family: string[] = (vd.familyHistory || []).filter(Boolean);
  if (family.length > 0) lines.push(`Family History: ${family.join(", ")}`);
  return lines.join("\n");
}

function buildInvestigationText(vd: any): string {
  if (!vd) return "";
  const lines: string[] = [];
  const inv = vd.investigationProfile || {};
  const prev: Array<{ name: string; result: string }> =
    inv.previousReports || [];
  if (prev.length > 0) {
    lines.push(
      `Previous: ${prev.map((r) => `${r.name} - ${r.result}`).join(", ")}`,
    );
  }
  const advised: Array<{ name: string }> = inv.advised || [];
  if (advised.length > 0) {
    lines.push(`Advised: ${advised.map((a) => a.name).join(", ")}`);
  }
  return lines.join("\n");
}

export default function PrescriptionPad({
  prescription,
  patientName,
  patientAge,
  patientWeight,
  registerNumber,
  chiefComplaints,
  investigations,
  drugHistory,
  vitalSigns,
  generalExam,
  nextVisitDate,
  linkedVisitId,
  patientId,
}: PrescriptionPadProps) {
  const [size, setSize] = useState<PadSize>("A4");
  const [editMode, setEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [selectedChamberIdx, setSelectedChamberIdx] = useState(0);

  const getStoredChambers = () => {
    try {
      const overrides = JSON.parse(
        localStorage.getItem("doctorContentOverrides") || "{}",
      );
      return overrides?.arman?.chambers || null;
    } catch {
      return null;
    }
  };

  const chambers: any[] = getStoredChambers() || doctors.arman.chambers;

  const rxId =
    prescription?.id !== undefined ? String(prescription.id) : "blank";
  const storageKey = `rx_pad_edits_${rxId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setEditedFields(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const [visitData, setVisitData] = useState<any>(null);

  useEffect(() => {
    if (!linkedVisitId) return;
    const allKeys = Object.keys(localStorage);
    const matchKey = allKeys.find((k) =>
      k.includes(`visit_form_data_${linkedVisitId}`),
    );
    if (matchKey) {
      try {
        setVisitData(JSON.parse(localStorage.getItem(matchKey) || "null"));
      } catch {
        // ignore
      }
    }
  }, [linkedVisitId]);

  const customPdfName = localStorage.getItem("prescription_pad_pdf_name");
  const customPdf = localStorage.getItem("prescription_pad_pdf");
  const padRef = useRef<HTMLDivElement>(null);

  const dateStr = prescription
    ? new Date(
        Number(prescription.prescriptionDate / 1000000n),
      ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const medications = prescription?.medications ?? [];
  const diagnosis = prescription?.diagnosis ?? "";

  const handleFieldChange = (key: string, val: string) => {
    setEditedFields((prev) => ({ ...prev, [key]: val }));
  };

  const savePadMetadata = () => {
    if (!patientId) return;
    const key = `savedPrescriptionPads_${patientId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const meta = {
        id: `pad_${Date.now()}`,
        patientId: String(patientId),
        prescriptionId: rxId,
        date: new Date().toLocaleDateString("en-GB"),
        timestamp: new Date().toISOString(),
        editedFields: { ...editedFields },
        medications: prescription?.medications ?? [],
        diagnosis: prescription?.diagnosis ?? "",
        patientName: patientName ?? "",
      };
      existing.push(meta);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(editedFields));
      savePadMetadata();
      toast.success("Prescription saved");
    } catch {
      toast.error("Failed to save changes");
    }
    setEditMode(false);
  };

  const handlePrint = () => {
    const printContent = padRef.current?.innerHTML ?? "";
    const pageSize = size === "A4" ? "A4" : "A5";
    const margin = size === "A4" ? "10mm" : "8mm";

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Prescription</title>
  <style>
    @page { size: ${pageSize}; margin: ${margin}; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111; }
    [contenteditable] { outline: none !important; background: transparent !important; cursor: default !important; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  ${printContent}
</body>
</html>`;

    savePadMetadata();
    const win = window.open("", "_blank", "width=900,height=1100");
    if (win) {
      win.document.write(printHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 400);
    }
  };

  const padWidth = size === "A4" ? "210mm" : "148mm";
  const padMinHeight = size === "A4" ? "297mm" : "210mm";
  const baseFontSize = size === "A4" ? "10px" : "9px";

  const ef = editedFields;
  const fc = handleFieldChange;

  return (
    <div>
      {customPdf && (
        <a
          href={customPdf}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors font-medium"
          data-ocid="prescription_pad.secondary_button"
        >
          📄 View Uploaded Prescription Template
          {customPdfName ? ` (${customPdfName})` : ""}
        </a>
      )}
      {/* Toolbar — hidden on print */}
      <div
        className="flex items-center gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex-wrap"
        style={{ fontFamily: "system-ui" }}
        data-ocid="prescription_pad.panel"
      >
        {chambers.length > 1 && (
          <>
            <span className="text-sm font-medium text-gray-600">Chamber:</span>
            <select
              value={selectedChamberIdx}
              onChange={(e) => setSelectedChamberIdx(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 mr-2"
              data-ocid="prescription_pad.select"
            >
              {chambers.map((c: any, i: number) => (
                <option key={c.id || i} value={i}>
                  {c.address || c.nameBn || `Chamber ${i + 1}`}
                </option>
              ))}
            </select>
          </>
        )}
        <span className="text-sm font-medium text-gray-600 mr-2">Size:</span>
        <button
          type="button"
          onClick={() => setSize("A4")}
          className={`px-3 py-1 text-sm rounded border transition-colors ${
            size === "A4"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          data-ocid="prescription_pad.toggle"
        >
          A4
        </button>
        <button
          type="button"
          onClick={() => setSize("A5")}
          className={`px-3 py-1 text-sm rounded border transition-colors ${
            size === "A5"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          data-ocid="prescription_pad.toggle"
        >
          A5 (Half A4)
        </button>

        {/* Edit Mode Badge */}
        {editMode && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
            ✏ Edit Mode
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {editMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="gap-2 border-green-400 text-green-700 hover:bg-green-50"
              data-ocid="prescription_pad.save_button"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
              data-ocid="prescription_pad.edit_button"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50"
            data-ocid="prescription_pad.primary_button"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Prescription Pad */}
      <div
        ref={padRef}
        style={{
          width: padWidth,
          minHeight: padMinHeight,
          background: "#fff",
          color: "#111",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: baseFontSize,
          padding: size === "A4" ? "12mm 12mm 10mm" : "8mm 8mm 8mm",
          boxSizing: "border-box",
          border: "1px solid #ddd",
          position: "relative",
          margin: "0 auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* ===== HEADER ===== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "6px",
          }}
        >
          {/* Left: S.N. + Chamber */}
          <div style={{ flex: "0 0 42%", paddingRight: "8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "6px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "10px" }}>S.N.</span>
              <EditableSpan
                fieldKey="sn"
                value=""
                editMode={editMode}
                editedFields={ef}
                onFieldChange={fc}
                style={{ minWidth: "80px" }}
                placeholder="___"
              />
            </div>
            <div style={{ marginBottom: "3px" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "10px",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                চেম্বার :
              </span>
              <div
                style={{
                  fontSize: "9px",
                  lineHeight: "1.55",
                  color: "#222",
                  fontFamily: "'Noto Sans Bengali', Arial, sans-serif",
                }}
              >
                {(() => {
                  const ch = chambers[selectedChamberIdx] || chambers[0];
                  if (!ch) return null;
                  if (ch.nameBn) {
                    return (
                      <>
                        <div>{ch.nameBn}</div>
                        {ch.addressBn
                          ? ch.addressBn
                              .split("\n")
                              .map((line: string) => (
                                <div key={line}>{line}</div>
                              ))
                          : ch.address && <div>{ch.address}</div>}
                      </>
                    );
                  }
                  return <div>{ch.address}</div>;
                })()}
              </div>
            </div>
          </div>

          {/* Right: Doctor Info */}
          <div style={{ textAlign: "right", flex: "0 0 56%" }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: size === "A4" ? "15px" : "12px",
                letterSpacing: "0.3px",
                color: "#0a1a3a",
                marginBottom: "2px",
                fontFamily: "Arial Black, Arial, sans-serif",
              }}
            >
              DR. ARMAN KABIR (ZOSID)
            </div>
            <div style={{ fontSize: "9px", lineHeight: "1.6", color: "#222" }}>
              <div>MBBS (D.U.)</div>
              <div>Emergency Medical Officer</div>
              <div>Dr. Sirajul Islam Medical College Hospital</div>
              <div>Registrar</div>
              <div>Dept. of General Surgery uDC</div>
              <div style={{ marginTop: "2px" }}>Reg. no. A-105224</div>
              <div style={{ marginTop: "3px" }}>Mob.no. 01751959262</div>
              <div style={{ paddingLeft: "38px" }}>01984587802</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr
          style={{
            border: "none",
            borderTop: "1.5px solid #333",
            margin: "5px 0",
          }}
        />

        {/* ===== PATIENT INFO ROW ===== */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            padding: "4px 0",
            flexWrap: "wrap",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Name: </span>
            <EditableSpan
              fieldKey="patient_name"
              value={patientName ?? ""}
              editMode={editMode}
              editedFields={ef}
              onFieldChange={fc}
              style={{ minWidth: "130px" }}
              placeholder="Patient Name"
            />
          </span>
          {registerNumber && (
            <span style={{ whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 700 }}>Reg.: </span>
              <span style={{ fontFamily: "monospace", fontSize: "10px" }}>
                {registerNumber}
              </span>
            </span>
          )}
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Age: </span>
            <EditableSpan
              fieldKey="patient_age"
              value={
                patientAge !== undefined && patientAge !== null
                  ? `${patientAge} yrs`
                  : ""
              }
              editMode={editMode}
              editedFields={ef}
              onFieldChange={fc}
              style={{ minWidth: "50px" }}
              placeholder="Age"
            />
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Weight: </span>
            <EditableSpan
              fieldKey="patient_wt"
              value={patientWeight ?? ""}
              editMode={editMode}
              editedFields={ef}
              onFieldChange={fc}
              style={{ minWidth: "45px" }}
              placeholder="Weight"
            />
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Date: </span>
            <EditableSpan
              fieldKey="date"
              value={dateStr}
              editMode={editMode}
              editedFields={ef}
              onFieldChange={fc}
              style={{ minWidth: "70px" }}
              placeholder="Date"
            />
          </span>
        </div>

        {/* Divider */}
        <hr
          style={{
            border: "none",
            borderTop: "1.5px solid #333",
            margin: "5px 0",
          }}
        />

        {/* ===== TWO-COLUMN BODY ===== */}
        <div
          style={{
            display: "flex",
            gap: "0",
            minHeight: size === "A4" ? "190mm" : "130mm",
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{
              flex: "0 0 44%",
              paddingRight: "10px",
              paddingTop: "6px",
            }}
          >
            {/* C/C */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "4px",
                  fontSize: "10px",
                }}
              >
                C/C
              </div>
              <span
                contentEditable={editMode}
                suppressContentEditableWarning
                onBlur={(e) => fc("cc", e.currentTarget.textContent || "")}
                style={{
                  display: "block",
                  fontSize: "9.5px",
                  lineHeight: "1.7",
                  borderBottom: "1px solid #aaa",
                  paddingBottom: "2px",
                  whiteSpace: "pre-wrap",
                  outline: editMode ? "1px dashed #f59e0b" : "none",
                  background: editMode ? "#fffbeb" : "transparent",
                  minHeight: "36px",
                  cursor: editMode ? "text" : "default",
                }}
              >
                {ef.cc ??
                  (visitData ? buildCCText(visitData) : chiefComplaints) ??
                  ""}
              </span>
              {!(ef.cc ?? chiefComplaints) && !editMode && (
                <div style={{ lineHeight: "1.8" }}>
                  <BlankLine width="100%" />
                  <br />
                  <BlankLine width="100%" />
                  <br />
                  <BlankLine width="80%" />
                </div>
              )}
            </div>

            {/* Condition Checkboxes: DM | HTN | Asthma | CKD */}
            <div
              style={{
                margin: "8px 0",
                display: "flex",
                flexWrap: "wrap",
                gap: "2px",
              }}
            >
              <ConditionBox label="DM" />
              <ConditionBox label="HTN" />
              <ConditionBox label="Asthma" />
              <ConditionBox label="CKD" />
            </div>

            {/* D/H */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "4px",
                  fontSize: "10px",
                }}
              >
                D/H:
              </div>
              <span
                contentEditable={editMode}
                suppressContentEditableWarning
                onBlur={(e) => fc("dh", e.currentTarget.textContent || "")}
                style={{
                  display: "block",
                  fontSize: "9.5px",
                  lineHeight: "1.7",
                  borderBottom: "1px solid #aaa",
                  paddingBottom: "2px",
                  whiteSpace: "pre-wrap",
                  outline: editMode ? "1px dashed #f59e0b" : "none",
                  background: editMode ? "#fffbeb" : "transparent",
                  minHeight: "28px",
                  cursor: editMode ? "text" : "default",
                }}
              >
                {ef.dh ??
                  (visitData ? buildPMHText(visitData) : drugHistory) ??
                  ""}
              </span>
              {!(ef.dh ?? drugHistory) && !editMode && (
                <div style={{ lineHeight: "1.8" }}>
                  <BlankLine width="100%" />
                  <br />
                  <BlankLine width="100%" />
                </div>
              )}
            </div>

            {/* O/E */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "10px",
                  marginBottom: "5px",
                }}
              >
                O/E:
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px 10px",
                  lineHeight: "1.8",
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>Temp: </span>
                  <EditableSpan
                    fieldKey="oe_temp"
                    value={
                      vitalSigns?.temperature ??
                      visitData?.vitalSigns?.temperature ??
                      ""
                    }
                    editMode={editMode}
                    editedFields={ef}
                    onFieldChange={fc}
                    style={{ minWidth: "36px" }}
                    placeholder="__"
                  />
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>B.P.: </span>
                  <EditableSpan
                    fieldKey="oe_bp"
                    value={
                      vitalSigns?.bloodPressure ??
                      visitData?.vitalSigns?.bloodPressure ??
                      ""
                    }
                    editMode={editMode}
                    editedFields={ef}
                    onFieldChange={fc}
                    style={{ minWidth: "40px" }}
                    placeholder="__/__"
                  />
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>Pulse: </span>
                  <EditableSpan
                    fieldKey="oe_pulse"
                    value={
                      vitalSigns?.pulse ?? visitData?.vitalSigns?.pulse ?? ""
                    }
                    editMode={editMode}
                    editedFields={ef}
                    onFieldChange={fc}
                    style={{ minWidth: "36px" }}
                    placeholder="__"
                  />
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>SpO2: </span>
                  <EditableSpan
                    fieldKey="oe_spo2"
                    value={
                      vitalSigns?.oxygenSaturation
                        ? `${vitalSigns.oxygenSaturation}%`
                        : visitData?.vitalSigns?.oxygenSaturation
                          ? `${visitData.vitalSigns.oxygenSaturation}%`
                          : ""
                    }
                    editMode={editMode}
                    editedFields={ef}
                    onFieldChange={fc}
                    style={{ minWidth: "36px" }}
                    placeholder="__%"
                  />
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "5px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>Anemia: </span>
                  <EditableSpan
                    fieldKey="oe_anemia"
                    value={
                      generalExam?.anemia ??
                      (visitData?.generalExamFindings?.Anemia ||
                        visitData?.generalExamFindings?.Anaemia ||
                        "")
                    }
                    editMode={editMode}
                    editedFields={ef}
                    onFieldChange={fc}
                    style={{ minWidth: "40px" }}
                    placeholder="__"
                  />
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>Jaundice: </span>
                  <EditableSpan
                    fieldKey="oe_jaundice"
                    value={
                      generalExam?.jaundice ??
                      (visitData?.generalExamFindings?.Jaundice ||
                        visitData?.generalExamFindings?.jaundice ||
                        "")
                    }
                    editMode={editMode}
                    editedFields={ef}
                    onFieldChange={fc}
                    style={{ minWidth: "40px" }}
                    placeholder="__"
                  />
                </span>
              </div>
            </div>

            {/* Investigation */}
            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "4px",
                  fontSize: "10px",
                }}
              >
                Investigation:
              </div>
              <span
                contentEditable={editMode}
                suppressContentEditableWarning
                onBlur={(e) =>
                  fc("investigation", e.currentTarget.textContent || "")
                }
                style={{
                  display: "block",
                  fontSize: "9.5px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  outline: editMode ? "1px dashed #f59e0b" : "none",
                  background: editMode ? "#fffbeb" : "transparent",
                  minHeight: "28px",
                  cursor: editMode ? "text" : "default",
                }}
              >
                {ef.investigation ??
                  (visitData
                    ? buildInvestigationText(visitData)
                    : investigations) ??
                  ""}
              </span>
              {!(ef.investigation ?? investigations) && !editMode && (
                <div style={{ lineHeight: "1.8" }}>
                  <BlankLine width="100%" />
                  <br />
                  <BlankLine width="100%" />
                  <br />
                  <BlankLine width="70%" />
                </div>
              )}
            </div>
          </div>

          {/* Vertical Divider */}
          <div
            style={{
              width: "1.5px",
              background: "#333",
              alignSelf: "stretch",
              flexShrink: 0,
            }}
          />

          {/* RIGHT COLUMN */}
          <div
            style={{
              flex: "1",
              paddingLeft: "12px",
              paddingTop: "4px",
            }}
          >
            {/* Rx Symbol */}
            <div
              style={{
                fontFamily: "'Times New Roman', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: size === "A4" ? "38px" : "28px",
                lineHeight: 1,
                color: "#0a1a3a",
                marginBottom: "6px",
                letterSpacing: "-1px",
              }}
            >
              &#8478;
            </div>

            {/* Diagnosis */}
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "10px" }}>D/M: </span>
              <EditableSpan
                fieldKey="diagnosis"
                value={diagnosis}
                editMode={editMode}
                editedFields={ef}
                onFieldChange={fc}
                style={{ fontSize: "9.5px", minWidth: "100px" }}
                placeholder="Diagnosis"
              />
            </div>

            {/* Treatment */}
            <div
              style={{ fontWeight: 700, fontSize: "10px", marginBottom: "6px" }}
            >
              Treatment:
            </div>

            {medications.length > 0 ? (
              <div style={{ lineHeight: "1.75" }}>
                {medications.map((med, i) => (
                  <div
                    key={`${med.name}-${i}`}
                    style={{
                      marginBottom: "8px",
                      paddingBottom: "6px",
                      borderBottom:
                        i < medications.length - 1 ? "1px dotted #ccc" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "10.5px",
                        display: "flex",
                        alignItems: "baseline",
                        gap: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Times New Roman', serif",
                          fontStyle: "italic",
                          fontSize: "11px",
                          marginRight: "2px",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}.
                      </span>
                      <EditableSpan
                        fieldKey={`med_${i}_name`}
                        value={med.name}
                        editMode={editMode}
                        editedFields={ef}
                        onFieldChange={fc}
                        style={{ fontWeight: 700, minWidth: "80px" }}
                        placeholder="Drug name"
                      />
                      <EditableSpan
                        fieldKey={`med_${i}_dose`}
                        value={med.dose ?? ""}
                        editMode={editMode}
                        editedFields={ef}
                        onFieldChange={fc}
                        style={{
                          fontWeight: 400,
                          fontSize: "9.5px",
                          minWidth: "40px",
                        }}
                        placeholder="dose"
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#333",
                        paddingLeft: "14px",
                        marginTop: "1px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "2px",
                        alignItems: "baseline",
                      }}
                    >
                      <EditableSpan
                        fieldKey={`med_${i}_freq`}
                        value={med.frequency ?? ""}
                        editMode={editMode}
                        editedFields={ef}
                        onFieldChange={fc}
                        style={{ minWidth: "50px" }}
                        placeholder="frequency"
                      />
                      {(ef[`med_${i}_freq`] ?? med.frequency) &&
                        (ef[`med_${i}_dur`] ?? med.duration) && (
                          <span> · </span>
                        )}
                      <EditableSpan
                        fieldKey={`med_${i}_dur`}
                        value={med.duration ?? ""}
                        editMode={editMode}
                        editedFields={ef}
                        onFieldChange={fc}
                        style={{ minWidth: "40px" }}
                        placeholder="duration"
                      />
                      <EditableSpan
                        fieldKey={`med_${i}_instr`}
                        value={med.instructions ?? ""}
                        editMode={editMode}
                        editedFields={ef}
                        onFieldChange={fc}
                        style={{
                          fontStyle: "italic",
                          color: "#555",
                          display: "block",
                          minWidth: "80px",
                        }}
                        placeholder="instructions"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ lineHeight: "2" }}>
                <BlankLine width="95%" />
                <br />
                <BlankLine width="95%" />
                <br />
                <BlankLine width="95%" />
                <br />
                <BlankLine width="95%" />
                <br />
                <BlankLine width="95%" />
                <br />
                <BlankLine width="95%" />
                <br />
                <BlankLine width="80%" />
              </div>
            )}

            {/* Notes */}
            <div style={{ marginTop: "10px" }}>
              <span
                style={{
                  fontSize: "9px",
                  fontStyle: "italic",
                  color: "#444",
                  fontWeight: 700,
                }}
              >
                Note:{" "}
              </span>
              <span
                contentEditable={editMode}
                suppressContentEditableWarning
                onBlur={(e) => fc("notes", e.currentTarget.textContent || "")}
                style={{
                  fontSize: "9px",
                  fontStyle: "italic",
                  color: "#444",
                  outline: editMode ? "1px dashed #f59e0b" : "none",
                  background: editMode ? "#fffbeb" : "transparent",
                  minWidth: "60px",
                  display: "inline-block",
                  cursor: editMode ? "text" : "default",
                }}
              >
                {ef.notes ?? prescription?.notes ?? ""}
              </span>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #aaa",
            margin: "8px 0 5px",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            fontFamily: "'Noto Sans Bengali', Arial, sans-serif",
          }}
        >
          <span
            style={{ fontWeight: 700, fontSize: "9.5px", whiteSpace: "nowrap" }}
          >
            পরবর্তী দেখার তারিখ:
          </span>
          <EditableSpan
            fieldKey="next_visit"
            value={nextVisitDate ?? ""}
            editMode={editMode}
            editedFields={ef}
            onFieldChange={fc}
            style={{ minWidth: "120px", fontSize: "9.5px" }}
            placeholder="Next visit date"
          />
        </div>
      </div>
    </div>
  );
}
