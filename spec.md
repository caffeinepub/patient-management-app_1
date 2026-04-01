# Dr. Arman Kabir's Care

## Current State
PatientDashboard.tsx renders a full dashboard with 9 colored tabs (Overview, Vitals, Investigations, History, Prescriptions, Appointments, Pending Approvals, Chat, Account Settings). The Account Settings tab exists but for the patient role it only shows Drug Reminders — it does NOT show the patient's own login credentials (mobile number, password).

The Drug Reminder dialog opens when the bell icon is clicked, but drugs must be typed manually — there is no auto-population from active prescriptions.

When a patient logs in, PatientPortalView in App.tsx tries to find the patientId by matching registerNumber in localStorage. If patientId is found but the patient record exists, tabs show. BUT if patientId is null (record not found), PatientDashboard shows "Patient not found" with no tabs at all — this is the "NO TAB" bug.

## Requested Changes (Diff)

### Add
- Account Settings tab for patient role: show current mobile number and current password (masked, with Show/Hide eye toggle). Patient can also change their password or mobile from here.
- Drug Reminder auto-populate: when the reminder bell panel opens, auto-list all drugs from all saved prescriptions for this patient (extracted from localStorage key `prescriptions_{patientId}`). Each drug shows with a time picker. Patient can then set reminder times for each auto-listed drug.
- A minimal patient portal view when patientId is null: show at least Account Settings tab with their credentials and drug reminders, plus a message that their health records are not yet linked.

### Modify
- PatientDashboard Account Settings tab: add a patient-facing section (visible when `currentRole === 'patient'`) showing their own phone and password (masked) with a Show/Hide toggle, plus inputs to change mobile/password with a Save button.
- Drug reminder dialog: on open, scan `prescriptions_{patientId}` from localStorage and extract drug names from all saved prescriptions. Show each unique drug as a quick-add card with a time picker. Clicking the card pre-fills `newReminderDrug` with the drug name.
- PatientDashboard: when `currentRole === 'patient'` and `patientId` is null or patient record not found, instead of showing "Patient not found" dead end, show a simplified dashboard with the Account Settings tab (with their credentials) and a notice that their health records are pending linking.
- Account Settings tab: password field shows current password (masked) with an eye icon toggle to reveal it.

### Remove
- Nothing removed

## Implementation Plan
1. In PatientDashboard: add a `showPasswordPlain` state (boolean, default false) for the Show/Hide toggle.
2. In Account Settings tab, add a patient-role section that reads `currentPatient` (passed as prop) to display their phone and password with Show/Hide toggle. Add inputs + save button that calls the same `handleSaveAccountSettings` logic but also works for the patient themselves (they update their own credentials via the patientRegistry in localStorage).
3. In the drug reminder dialog, add a `prescriptionDrugs` computed list: read `prescriptions_{patientId}` from localStorage, parse all prescriptions, extract unique drug names from medications arrays. Show these as clickable chips at the top of the Add Reminder section so the user can tap a drug name to pre-fill the drug name input.
4. In PatientDashboard: if `currentRole === 'patient'` AND (`!patient` or `loadingPatient`), render a minimal layout with just the Account Settings content (credentials + drug reminders) instead of the "Patient not found" error screen. Pass `currentPatient` data through.
5. In PatientPortalView (App.tsx): if patientId is null but registerNumber exists, pass `patientId={null}` to PatientDashboard with `currentRole='patient'` — already done. Just ensure PatientDashboard handles this gracefully (step 4 above).
