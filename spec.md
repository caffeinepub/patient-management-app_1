# Dr. Arman Kabir's Care

## Current State
PrescriptionForm exists with manual medication entry (drug name, dose, frequency, duration, instructions). PatientProfile has a Prescriptions tab. No auto-suggestion from diagnosis.

## Requested Changes (Diff)

### Add
- DIMS (Drug Information Management System) data file: maps common diagnoses to standard medication protocols
- Auto-prescription generation: when a diagnosis is typed/selected, DIMS looks up matching protocol and pre-fills all medication fields
- Diagnosis search/autocomplete: searchable dropdown with common diagnoses
- Edit option: all auto-generated fields remain fully editable after auto-fill
- Printable prescription view: formatted output with doctor name, patient info, medications

### Modify
- PrescriptionForm: add diagnosis autocomplete with DIMS lookup, auto-fill button, editable pre-populated medications
- PatientProfile prescription detail dialog: add print button

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/components/DimsData.ts` - comprehensive diagnosis→medications mapping (50+ diagnoses covering common conditions)
2. Update `PrescriptionForm.tsx` - add diagnosis searchable dropdown, "Auto-fill from DIMS" trigger when diagnosis selected, keep all fields editable
3. Update PatientProfile prescription view dialog to show a print-friendly prescription
