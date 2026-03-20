import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useRef, useState } from "react";
import type { Prescription } from "../backend.d";

interface PrescriptionPadProps {
  prescription?: Prescription | null;
  patientName?: string;
  patientAge?: number | null;
  patientWeight?: string;
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

export default function PrescriptionPad({
  prescription,
  patientName,
  patientAge,
  patientWeight,
  chiefComplaints,
  investigations,
  drugHistory,
  vitalSigns,
  generalExam,
  nextVisitDate,
}: PrescriptionPadProps) {
  const [size, setSize] = useState<PadSize>("A4");
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
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  ${printContent}
</body>
</html>`;

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
          uD83DuDCC4 View Uploaded Prescription Template
          {customPdfName ? ` (${customPdfName})` : ""}
        </a>
      )}
      {/* Toolbar — hidden on print */}
      <div
        className="flex items-center gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
        style={{ fontFamily: "system-ui" }}
        data-ocid="prescription_pad.panel"
      >
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="ml-auto gap-2 border-teal-300 text-teal-700 hover:bg-teal-50"
          data-ocid="prescription_pad.primary_button"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
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
              <BlankLine width="80px" />
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
                <div>ইউনিভার্সিটি ডেন্টাল কলেজ এন্ড হাসপাতাল</div>
                <div>নিচ তলা ( সেন্তুরি আর্কেড নার্সিং মল ),</div>
                <div>১২০/এ, আতাউর সার্কুলার রোড,</div>
                <div>নিউমার্কেট ,ঢাকা .</div>
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
              <div>Dept. of General Surgery JIDC</div>
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
            {patientName ? (
              <span
                style={{
                  borderBottom: "1px solid #555",
                  paddingRight: "8px",
                  minWidth: "120px",
                  display: "inline-block",
                }}
              >
                {patientName}
              </span>
            ) : (
              <BlankLine width="130px" />
            )}
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Age: </span>
            {patientAge !== undefined && patientAge !== null ? (
              <span
                style={{
                  borderBottom: "1px solid #555",
                  paddingRight: "6px",
                  display: "inline-block",
                }}
              >
                {patientAge} yrs
              </span>
            ) : (
              <BlankLine width="50px" />
            )}
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Wt: </span>
            {patientWeight ? (
              <span
                style={{
                  borderBottom: "1px solid #555",
                  paddingRight: "6px",
                  display: "inline-block",
                }}
              >
                {patientWeight}
              </span>
            ) : (
              <BlankLine width="45px" />
            )}
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700 }}>Date: </span>
            {dateStr ? (
              <span
                style={{
                  borderBottom: "1px solid #555",
                  paddingRight: "6px",
                  display: "inline-block",
                }}
              >
                {dateStr}
              </span>
            ) : (
              <BlankLine width="70px" />
            )}
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
              {chiefComplaints ? (
                <div
                  style={{
                    fontSize: "9.5px",
                    lineHeight: "1.7",
                    borderBottom: "1px solid #aaa",
                    paddingBottom: "2px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {chiefComplaints}
                </div>
              ) : (
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
              {drugHistory ? (
                <div
                  style={{
                    fontSize: "9.5px",
                    lineHeight: "1.7",
                    borderBottom: "1px solid #aaa",
                    paddingBottom: "2px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {drugHistory}
                </div>
              ) : (
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
                  {vitalSigns?.temperature ? (
                    <span
                      style={{
                        borderBottom: "1px solid #555",
                        paddingRight: "4px",
                        display: "inline-block",
                      }}
                    >
                      {vitalSigns.temperature}
                    </span>
                  ) : (
                    <BlankLine width="36px" />
                  )}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>B.P.: </span>
                  {vitalSigns?.bloodPressure ? (
                    <span
                      style={{
                        borderBottom: "1px solid #555",
                        paddingRight: "4px",
                        display: "inline-block",
                      }}
                    >
                      {vitalSigns.bloodPressure}
                    </span>
                  ) : (
                    <BlankLine width="40px" />
                  )}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>Pulse: </span>
                  {vitalSigns?.pulse ? (
                    <span
                      style={{
                        borderBottom: "1px solid #555",
                        paddingRight: "4px",
                        display: "inline-block",
                      }}
                    >
                      {vitalSigns.pulse}
                    </span>
                  ) : (
                    <BlankLine width="36px" />
                  )}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>SpO2: </span>
                  {vitalSigns?.oxygenSaturation ? (
                    <span
                      style={{
                        borderBottom: "1px solid #555",
                        paddingRight: "4px",
                        display: "inline-block",
                      }}
                    >
                      {vitalSigns.oxygenSaturation}%
                    </span>
                  ) : (
                    <BlankLine width="36px" />
                  )}
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
                  {generalExam?.anemia ? (
                    <span
                      style={{
                        borderBottom: "1px solid #555",
                        paddingRight: "4px",
                        display: "inline-block",
                      }}
                    >
                      {generalExam.anemia}
                    </span>
                  ) : (
                    <BlankLine width="40px" />
                  )}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 600 }}>Jaundice: </span>
                  {generalExam?.jaundice ? (
                    <span
                      style={{
                        borderBottom: "1px solid #555",
                        paddingRight: "4px",
                        display: "inline-block",
                      }}
                    >
                      {generalExam.jaundice}
                    </span>
                  ) : (
                    <BlankLine width="40px" />
                  )}
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
              {investigations ? (
                <div
                  style={{
                    fontSize: "9.5px",
                    lineHeight: "1.7",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {investigations}
                </div>
              ) : (
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

            {/* Diagnosis if available */}
            {diagnosis && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "10px" }}>D/M: </span>
                <span
                  style={{
                    fontSize: "9.5px",
                    borderBottom: "1px solid #555",
                    paddingRight: "6px",
                    display: "inline-block",
                  }}
                >
                  {diagnosis}
                </span>
              </div>
            )}

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
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Times New Roman', serif",
                          fontStyle: "italic",
                          fontSize: "11px",
                          marginRight: "2px",
                        }}
                      >
                        {i + 1}.
                      </span>
                      {med.name}
                      {med.dose && (
                        <span style={{ fontWeight: 400, fontSize: "9.5px" }}>
                          — {med.dose}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "9px",
                        color: "#333",
                        paddingLeft: "14px",
                        marginTop: "1px",
                      }}
                    >
                      {med.frequency && <span>{med.frequency}</span>}
                      {med.frequency && med.duration && <span> · </span>}
                      {med.duration && <span>{med.duration}</span>}
                      {med.instructions && (
                        <div style={{ fontStyle: "italic", color: "#555" }}>
                          {med.instructions}
                        </div>
                      )}
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

            {/* Notes if any */}
            {prescription?.notes && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "9px",
                  fontStyle: "italic",
                  color: "#444",
                }}
              >
                Note: {prescription.notes}
              </div>
            )}
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
          {nextVisitDate ? (
            <span
              style={{
                borderBottom: "1px solid #555",
                minWidth: "80px",
                paddingRight: "8px",
                display: "inline-block",
                fontSize: "9.5px",
              }}
            >
              {nextVisitDate}
            </span>
          ) : (
            <BlankLine width="120px" />
          )}
        </div>
      </div>
    </div>
  );
}
