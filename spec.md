# Dr. Arman Kabir's Care — Prescription & EMR Upgrade (Version 46)

## Current State

The app has two prescription components:
- `UpgradedPrescriptionEMR.tsx` — A full-screen 3-panel layout with sticky patient info, left clinical summary panel, and center Rx panel. Currently the left panel fields (C/C, P/M/H, D/H, O/E, Investigation, Advice) are empty text areas — NOT auto-populated from visit/patient data.
- `NewPrescriptionMode.tsx` — An older split-screen mode.

Visit data is stored in localStorage under key `visit_form_data_${visitId}_${doctorEmail}` with extended fields:
- `chiefComplaints[]`, `complaintAnswers{}` (each complaint maps to array of answers)
- `pastMedicalHistory` (string), `pastMedicalHistoryAll` (object)
- `drugHistory[]` (array of drug objects with name, dose, frequency, duration)
- `vitalSigns` (bloodPressure, pulse, temperature, oxygenSaturation, respiratoryRate)
- `generalExamFindings{}`, `systemicExamFindings{}`
- `previous_investigation_rows[]` (date, name, result, unit, interpretation)
- `investigationAdvice` (string)
- Various history fields: personal, family, immunization, allergy, obstetric, gynaecological

Patient data is stored via backend with: fullName, gender, dateOfBirth, weight, address, bloodGroup, registerNumber (custom localStorage field), phone.

## Requested Changes (Diff)

### Add
- Auto-population of ALL left panel clinical summary fields from visit localStorage data when opening prescription linked to a visit
- **C/C**: Each chief complaint formatted as "1. [complaint] — [answer1], [answer2]" one per line
- **P/M/H**: Past medical + surgical history from visit form 
- **History**: All POSITIVE history entries only (personal, family, immunization, allergy, obstetric, gynaecological) — one sentence each with answer
- **D/H**: Drug history formatted as comma-separated list: "Tab. Napa 500mg 1+1+1, Tab. Fexo 120mg once daily"
- **O/E**: Vitals first (BP/Pulse/Temp/SpO2/RR), then general exam findings (only answered), then systemic exam findings (only answered). Default fallback: "Heart: S1+S2+0, Lung: Clear, P/A: NAD"
- **Investigation Report**: Previous investigation rows formatted by date (newest first): "13/03/2026: Hb% - 12.3g/dl, S.Creatinine - 1.12"
- **Advice/New Investigation**: investigationAdvice field from visit
- Drug table: Add "Form" column (Tab./Cap./Syp./Inf./Inj./Supp.) and "Special Instruction" column — both in Bangla+English
- Drug input form: Add "Form" selector and "Special Instruction" field (Bangla+English, editable)
- Drug table columns: Form | Drug Name (Brand bold / Generic normal) | Dose | Route (Bangla main, editable) | Frequency (Bangla main) | Duration (Bangla main, editable) | Instructions (Bangla main, editable) | Special Instruction (Bangla main, editable)
- "Search on Medex" button/link next to drug name field (opens medex.com.bd search)
- Each panel section with distinct colorful background to differentiate
- "Load from Visit" button at top of left panel to re-populate all fields from most recent visit
- Patient info: populate from patient registration data + visit data (registerNumber from localStorage)

### Modify
- `UpgradedPrescriptionEMR` to accept `visitData` and `visitExtendedData` props
- PatientProfile page to pass the most recent visit's extended localStorage data when opening `UpgradedPrescriptionEMR`
- Left panel sections to be visually distinct with colored headers/backgrounds: C/C (blue), P/M/H (green), History (purple), D/H (amber), O/E (rose), Investigation (teal), Advice/New Inv. (orange)
- Drug route and frequency fields: show Bangla text primarily, editable
- Prescription preview: reflects all left panel fields (clinical summary) + drug table + advice

### Remove
- Nothing removed

## Implementation Plan

1. **Extend `UpgradedPrescriptionEMR` props** — add `visitExtendedData?` prop of type matching the localStorage structure
2. **Auto-populate logic** — on component mount, if `visitExtendedData` exists, format and populate all left panel fields
3. **C/C formatting** — iterate `chiefComplaints[]` + `complaintAnswers{}`, build numbered sentences
4. **D/H formatting** — iterate `drugHistory[]` array, format as "Tab. DrugName dose frequency"
5. **O/E formatting** — vitals line first, then general exam (filter only answered), then systemic (filter only answered), with fallback
6. **Investigation Report formatting** — sort `previous_investigation_rows[]` by date descending, format per line
7. **Drug table** — add Form column and Special Instruction column with Bangla/English dual display + editability
8. **Drug input form** — add Form type selector (Tab./Cap./Syp./Inj./Inf./Supp.) and Special Instruction field
9. **Medex search** — add button next to drug name that opens `https://medex.com.bd/` in new tab
10. **Panel colors** — each left panel section gets distinct colored card background
11. **PatientProfile page** — when opening `UpgradedPrescriptionEMR`, read the relevant visit's extended data from localStorage and pass it as prop
12. **"Load from Visit" button** — in left panel, re-triggers population from localStorage
13. **Prescription preview** — update to show clinical summary section (left panel fields) before the Rx table
