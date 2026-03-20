# Dr. Arman Kabir's Care

## Current State
- DIMS auto-fills medications when a diagnosis is typed in PrescriptionForm
- PrescriptionPad renders a hardcoded physical pad layout for printing
- Admin can edit public portal content via admin login
- No mechanism for uploading a custom prescription pad PDF template

## Requested Changes (Diff)

### Add
- Admin PDF upload panel: when logged in as admin, a new section in the prescription/settings area allows uploading a prescription pad PDF template
- Uploaded PDF stored in localStorage as a base64 data URL under key `prescription_pad_pdf`
- Admin can replace the PDF by uploading a new one (overwrites previous)
- Admin can delete the current PDF (reverts to hardcoded pad layout)
- In PrescriptionPad: if a custom PDF is stored, show a "View Template PDF" link/button alongside the normal pad
- DIMS auto-fill continues to work as before — diagnosis triggers medication suggestions
- All medication fields remain fully editable after auto-fill

### Modify
- AdminPDFManager component (new): a card/section visible only to admins for uploading, previewing, and deleting the prescription pad PDF
- This component is accessible from the admin panel on the public landing page OR embedded in PrescriptionPad print view area
- PrescriptionPad: add a "Custom PDF Template" section showing the stored PDF if available

### Remove
- Nothing removed

## Implementation Plan
1. Create `PrescriptionPDFManager.tsx` component: file input for PDF upload, stores as base64 in localStorage, shows current file name if set, delete button to remove it
2. Integrate `PrescriptionPDFManager` into the admin-visible area of the public portal (e.g., as a card in the admin edit toolbar or as a section in the CV/admin editing panel)
3. In `PrescriptionPad.tsx`: read `prescription_pad_pdf` from localStorage; if present, render an iframe or link to preview/download the uploaded PDF template alongside the Rx pad
4. Ensure DIMS auto-fill and editable medications in `PrescriptionForm` remain unchanged
