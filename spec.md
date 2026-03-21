# Dr. Arman Kabir's Care

## Current State
VisitForm.tsx has these sections (in order):
- Chief Complaints, System Review, History, Drug History, Vital Signs, General Exam, Systemic Exam
- Salient Features (with Auto-Generate button)
- Brief Summary bar (with 4 sub-fields: history, examination, investigation, overall)
- Full Evaluation field
- Analysis field
- Diagnosis
- Notes

## Requested Changes (Diff)

### Add
- **Previous Investigation Report** bar: placed BEFORE Salient Features. Has a text area for entering previous report details AND an image/photo upload option. When Auto-Generate is clicked on Salient Features, the previous investigation data is included in the generated narrative.
- **Differential Diagnosis** bar: placed AFTER Salient Features. Has:
  - AI Auto-Generate button that generates differential diagnosis based on salient features content
  - Image/photo upload: extracts values from uploaded image. Before using, checks patient name+age+date on the report for confirmation. Doctor must confirm extracted data before it's applied.
  - Only date is stored with the report (not name/age validation stored)
  - PDF note field (PDF processing is manual/noted for future)
  - Fully editable textarea
- **New Investigation Advice** bar: placed AFTER Differential Diagnosis. Has:
  - AI Auto-Generate button that generates investigation suggestions based on differential diagnosis
  - PDF note field (for future PDF-based list)
  - Fully editable textarea

### Modify
- **Salient Features Auto-Generate**: include previous investigation report data in the generated narrative
- Remove Brief Summary bar entirely (4 sub-fields + overall)
- Remove Full Evaluation field
- Remove Analysis field
- Admin can edit visit form format (inline edit buttons on section titles/labels when logged in as admin)

### Remove
- Brief Summary Card (with all 4 sub-fields)
- Full Evaluation textarea
- Analysis textarea

## Implementation Plan
1. Update VisitFormData interface: remove brief_summary fields, add previous_investigation_report, differential_diagnosis, investigation_advice fields
2. Update initial formData state to remove removed fields and add new ones
3. Update generateSalientFeatures() to include previous_investigation_report
4. Add Previous Investigation Report Card before Salient Features (textarea + image upload)
5. Remove Brief Summary Card, Full Evaluation, Analysis sections
6. Add Differential Diagnosis Card after Salient Features with AI generate button, image upload with name/age/date confirmation dialog
7. Add New Investigation Advice Card after Differential Diagnosis with AI generate button
8. Admin inline edit buttons on section labels (already partially implemented - ensure visit form sections have data-ocid for admin editing)
