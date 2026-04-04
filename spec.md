# Dr. Arman Kabir's Care — Version 59

## Current State

The app is a full-stack bilingual (English/Bangla) Patient Management and Doctor Portal. Built with React + Vite + TailwindCSS + shadcn/ui. All data in localStorage.

- **Auth**: 4 roles — Admin, Doctor, Staff, Patient. Patients sign up via register number + phone + password; doctor approval required. `useEmailAuth.tsx` handles all auth logic.
- **Patient Portal**: When `currentPatient` is set and no doctor is logged in, `App.tsx` renders a custom patient navbar + `PatientPortalView` which looks up the patient record and renders `PatientDashboard` with `currentRole="patient"`.
- **PatientDashboard** (`pages/PatientDashboard.tsx`, ~4061 lines): Has a left sidebar with colored tabs (Overview, Vitals, Investigations, History, Prescriptions, Appointments, Pending Approvals, Chat, Account). The Bell reminder button is rendered in the dashboard header.
- **Account Settings tab**: Shows current phone/password (masked), allow sign-up toggle, credential edit for admin/doctor.
- **Drug reminders**: Bell button in dashboard opens a panel where drugs from prescriptions can be selected and reminder times set manually. Both patient and doctor can set reminders. Notifications fire browser + in-app.
- **Complaints**: Currently submitted via the `PatientSubmission` flow (type=`complaint`) in the Pending Approvals tab. There is no standalone timestamped complaints log.
- **Patient Portal navbar**: Has patient name, "Patient Portal" label, and a Sign Out button. The bell icon is inside the main dashboard, not the navbar.

## Requested Changes (Diff)

### Add

1. **Patient Portal — own profile only**: When a patient logs in, they land directly on their own dashboard (already done via `PatientPortalView`). Ensure the patient sees ONLY their own record — no ability to navigate to other patients.

2. **Patient Portal — selective view**: Patient can only see their own data across all 9 tabs. No browsing other patients. This is already architected but needs to be verified as strictly enforced.

3. **Drug reminder bell — patient portal navbar only**: Move the Bell icon from inside the dashboard to the patient portal navbar (the sticky header shown when `currentPatient` is logged in). Hide the bell from the doctor's navbar entirely. Bell fires browser + in-app notifications only for the patient. Doctor can still set reminders from inside the patient profile (from within the dashboard).

4. **Complaints Log (new section)**: A dedicated "Complaints" tab (or section within Overview/Pending Approvals) in the patient dashboard where:
   - Patient can type and submit a new complaint any time — NOT tied to a visit
   - Each complaint saved with timestamp (date + time)
   - Both patient and doctor can view the full timestamped complaints log
   - Doctor sees it inside the patient profile (in the patient's dashboard)
   - Patient sees it in their own dashboard
   - Stored in localStorage under a key like `medicare_patient_complaints_{patientId}`
   - Displayed as a table/list: Date & Time | Complaint text | Status (Pending / Seen by Doctor)
   - Doctor can mark complaints as "Seen" or respond with a short note
   - The "Pending Approvals" tab continues to handle vitals/investigation submissions

### Modify

1. **Patient Portal navbar**: Add the Bell icon with active reminder count badge to the patient navbar header (in `App.tsx` `AppInner` patient section). Remove bell from the inner dashboard header area.

2. **PatientDashboard tabs**: Add a new "Complaints" tab (💬 Complaints or 📝 Complaints) to the left sidebar with its own color. Keep all existing 9 tabs. This becomes the 10th tab OR replace the Chat tab placement and restructure — actually add it as a new tab between "Pending Approvals" and "Chat":
   - Overview (blue)
   - Vitals (green)
   - Investigations (purple)
   - History (amber)
   - Prescriptions (rose)
   - Appointments (teal)
   - Pending Approvals (orange)
   - **Complaints (indigo)** ← NEW
   - Chat (sky)
   - Account Settings (gray)

3. **Complaints data model**: Use localStorage key `medicare_complaints_{patientId}` (string patientId). Each entry: `{ id, patientId, text, timestamp, status: 'pending'|'seen', doctorNote?: string }`

### Remove

- Nothing removed. All existing features preserved.

## Implementation Plan

1. **Add complaints storage helpers** at the top of `PatientDashboard.tsx`:
   - `loadComplaints(patientId: string): ComplaintEntry[]`
   - `saveComplaints(patientId: string, complaints: ComplaintEntry[]): void`
   - Interface: `ComplaintEntry { id, patientId, text, timestamp, status, doctorNote? }`

2. **Add Complaints tab** to the left sidebar TabsList with indigo active color.

3. **Implement Complaints tab content**:
   - Top: textarea + "Submit Complaint" button (visible to patient role, or if `currentRole === 'patient'`)
   - Below: list/table of all complaints sorted newest first
   - Each row: formatted datetime | complaint text | status badge (Pending = amber, Seen = green)
   - Doctor sees the same list PLUS a "Mark as Seen" button and a text input for a doctor note per entry
   - If `currentRole === 'doctor'` or `'staff'` or `'admin'`: show the doctor note field and Mark Seen button per row

4. **Move Bell icon to patient navbar** in `App.tsx`:
   - The `AppInner` patient section currently renders a simple header with name + Sign Out
   - Add the bell button (with count badge) to this header, to the right of the patient name
   - The bell button opens the same reminder panel as before (drug reminder management)
   - Pass reminder state up or use a shared localStorage key so the bell in the navbar can read the count
   - Remove the bell button from inside `PatientDashboard` component header area

5. **Bell hidden from doctor navbar**: In `Layout.tsx` (doctor navbar), ensure no bell icon is rendered. Doctors can still set reminders within the patient profile but don't see the bell ring in their own view.

6. **Ensure patient-only view**: In `PatientPortalView` and `PatientDashboard`, when `currentRole === 'patient'`, confirm no navigation links or buttons allow accessing other patients.
