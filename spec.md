# Dr. Arman Kabir's Care

## Current State
The Prescription & EMR module (`UpgradedPrescriptionEMR.tsx`) has a `populateFromVisitData()` function that reads `visitExtendedData` (saved in localStorage as `visit_form_data_{visitId}_{doctorEmail}` by `VisitForm.tsx`) and populates the left clinical summary panel.

The function currently has several gaps:

1. **C/C** — Complaint answers are stored as `{question: answer}` maps (e.g. `{"Duration": "10 days", "Character": "productive", "Color": "yellow"}`). Current code joins answers as `complaint — ans1, ans2, ans3`. The required format is a single sentence: `cough for 10 days, productive, yellow.`
2. **System Review** — Currently appended as `Positive system review: k: v; k: v`. Needs to be listed as `• He/she also complains of [symptom]: [finding]`.
3. **P/M/H** — Currently works but doesn't include surgical history answers coherently.
4. **History tabs (Personal, Family, Immunization, Allergy, Others)** — Currently reads `historyPersonal`, `historyFamily`, `historyImmunization`, `historyAllergy` but VisitForm stores them as arrays: `personalHistory[]`, `familyHistory[]`, `immunizationHistory[]`, `allergyHistory[]`, plus `epiSchedule` ("yes"/"no"). The EPI schedule currently appears separately, but should be integrated into immunization text. Others tab should include obstetric + gynaecological histories.
5. **D/H** — VisitForm stores `drugHistory` as `{name, dose, duration}` (no `type` field). Current code tries to read `d.type` which is always undefined.
6. **O/E** — Correct structure but:
   - Weight is not in vitalSigns (VisitForm doesn't store it there) — weight comes from patient registration
   - After vitals, should show: `Heart: S1+S2+0, Lung: Clear` as default cardiac/pulmonary baseline (always), then positive general exam, then systemic exam findings
   - Specialty exams (respiratoryExam, cardiovascularExam, neurologicalExam, etc.) are stored in extendedData but NOT read
7. **Investigation Report** — VisitForm stores rows under `previousInvestigationRows` (camelCase) but the EMR reads `previous_investigation_rows` (snake_case). This causes investigation data to never populate.
8. **Advice/New Investigation** — Reads `investigationAdvice` correctly.

## Requested Changes (Diff)

### Add
- Read `vd.previousInvestigationRows` (camelCase) as the primary source for investigation rows, with `vd.previous_investigation_rows` as fallback
- In O/E: read and include specialty exam findings from `vd.respiratoryExam`, `vd.cardiovascularExam`, `vd.neurologicalExam`, `vd.gastrointestinalExam`, `vd.musculoskeletalExam` (each is a nested object with section → findings)
- Always include `Heart: S1+S2+0, Lung: Clear` as a baseline O/E line (after vitals, before any positive findings). If `cardiovascularExam` has positive findings, replace heart baseline with those. If `respiratoryExam` has positive findings, replace lung baseline with those.
- Add a "Generate from Visit" / "Load from Visit" button above the clinical summary left panel to manually re-trigger population from the latest visit data (helpful when user opens a new prescription without a specific visit pre-selected)

### Modify
- **C/C formatting**: Each complaint becomes 1 sentence. Join all question answers as comma-separated values after the complaint name: `1. Cough — for 10 days, productive, yellow sputum.` (answer values only, not question labels). If no answers, just show the complaint name.
- **System review**: Change from `Positive system review: k: v` to separate lines like `• Also complains of fever: present for 2 days` (one line per positive system review item that was answered with something other than Normal/None/No/Absent/-)
- **Immunization history**: Combine `immunizationHistory[]` answers + EPI schedule into one text. If `epiSchedule === "yes"`, prepend `Immunised as per EPI schedule.` then list any other immunization items.
- **Allergy history**: Read `allergyHistory[]` array and join as comma-separated sentence.
- **Others history**: Include `obstetricHistory[]` + `gynaecologicalHistory[]` (stored in extendedData as those keys) formatted as readable text.
- **D/H**: Drug history items have no `type` field. Format as: `Tab. {name} {dose} {duration}` (always use "Tab." as default prefix since type is not stored, or omit the prefix and just use `{name} {dose} {duration}`).
- **O/E vitals**: Add weight from `patientWeight` prop alongside the vital signs line (e.g., `BP: 120/80 mmHg, Pulse: 80/min, Temp: 98.6°F, SpO2: 98%, RR: 18/min, Wt: 65 kg`)
- **Investigation**: Use `vd.previousInvestigationRows` (camelCase) primarily. Keep existing grouping by date, sort newest first. Format: `13/03/2026: Hb - 12.3 g/dl, S.Creatinine - 1.12 mg/dl`.

### Remove
- Nothing removed

## Implementation Plan

1. **Fix `populateFromVisitData()` in `UpgradedPrescriptionEMR.tsx`**:
   - Fix investigation rows: read `vd.previousInvestigationRows` (camelCase) first, fallback to `vd.previous_investigation_rows`
   - Fix C/C: for each complaint, the `complaintAnswers[complaint]` is a `Record<string, string>` (question → answer). Extract only the values (not keys) and join as comma-separated sentence.
   - Fix system review: render as `• Also complains of [system]: [finding]` per positive item
   - Fix D/H: use just `{name} {dose} {duration}` without the undefined `type` field; use proper drug form format
   - Fix immunization: prepend EPI text if `vd.epiSchedule === "yes"`, then join `immunizationHistory` array
   - Fix allergy: join `allergyHistory` array
   - Fix others: combine `obstetricHistory` + `gynaecologicalHistory` arrays
   - Fix O/E: add weight from patientWeight prop; add heart/lung baseline; read specialty exam findings from extended data keys

2. **Pass weight to `populateFromVisitData()`**: the function currently doesn't have access to `patientWeight`. Either pass it as a second argument or call `setOe()` after calling `populateFromVisitData()` to append weight from the prop.

3. **Add "Load from Visit" button** in the left clinical summary panel header — clicking it re-runs `applyVisitData(visitExtendedData)` even if a draft exists. Only show if `visitExtendedData` is available.

4. All left panel fields (C/C, P/M/H, History tabs, D/H, O/E, Investigation, Advice) remain fully editable textareas after population — no change to editability.

5. Run typecheck and build, fix any errors.
