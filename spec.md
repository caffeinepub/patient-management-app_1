# Dr. Arman Kabir's Care

## Current State
PrescriptionPad is a print-preview component that renders the prescription in a physical pad layout. It is read-only — doctors cannot edit any fields in the pad view. Dr. Arman Kabir's credentials are hardcoded with a typo ("General Surgery JIDC" instead of "General Surgery uDC").

## Requested Changes (Diff)

### Add
- Inline edit mode for PrescriptionPad: an "Edit" button in the toolbar that toggles an editable state
- When edit mode is on, all text fields in the pad become editable inline (contentEditable or controlled inputs): patient name, age, weight, date, C/C, D/H, O/E values, medications (drug name, dose, frequency, duration, instructions), diagnosis, notes, next visit date, S.N.
- A "Save" button to persist edits to localStorage keyed by prescription ID
- Edits are loaded back when the pad is reopened for the same prescription

### Modify
- Fix Dr. Arman Kabir's credentials: change "Dept. of General Surgery JIDC" → "Dept. of General Surgery uDC"
- PrescriptionPad toolbar: add Edit/Save toggle button alongside existing A4/A5/Print buttons

### Remove
- Nothing removed

## Implementation Plan
1. Add `editMode` state and `editedFields` state (record of overridden field values) to PrescriptionPad
2. Load saved edits from localStorage on mount using prescription ID as key
3. Fix credentials typo: JIDC → uDC
4. Add Edit/Save button to toolbar; toggling edit mode shows contentEditable-style fields
5. When in edit mode, each pad field renders as an editable `<span contentEditable>` or `<input>` with matching styling
6. On Save, persist `editedFields` to localStorage and exit edit mode
7. When printing, use the edited values (not original props)
