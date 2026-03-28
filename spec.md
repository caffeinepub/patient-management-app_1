# Dr. Arman Kabir's Care

## Current State

The app has:
- Custom email/password auth with Doctor and Staff roles (plus separate Admin)
- Doctor approval flow for staff accounts (pending/approved/rejected)
- Patient management: registration, visit forms, prescriptions, investigation reports
- Existing PatientProfile page with visits, prescriptions, investigation profile, vitals
- Public landing page with appointment booking and emergency consultation
- All data stored in localStorage per doctor

Key files:
- `src/hooks/useEmailAuth.tsx` — DoctorAccount interface (doctor | staff roles), registry stored in `medicare_doctors_registry`, session in `medicare_current_doctor`
- `src/hooks/useAdminAuth.tsx` — separate admin login
- `src/App.tsx` — routing, auth modal, pending approvals panel
- `src/pages/PatientProfile.tsx` — existing patient detail page
- `src/pages/Patients.tsx` — patient list page

## Requested Changes (Diff)

### Add

1. **Patient role** in auth system:
   - New `PatientAccount` interface in localStorage: `medicare_patients_auth_registry` key
   - Fields: id, phone, password (hashed), name, age, gender, patientId (links to patient record by register number), status: pending|approved|rejected
   - Patient self-signup via phone number + password + name + register number (optional, to link existing record)
   - Doctor approves patient logins — appears in existing pending approvals panel alongside staff
   - Patient session stored in `medicare_patient_session` key
   - Patient login tab added to the existing Staff Login dialog (3 tabs: Staff, Doctor, Patient)

2. **PatientDashboard** component replacing existing PatientProfile page:
   - Left sidebar: avatar, name, age, gender, contact info, patient ID, register number; Edit Profile button (Doctor/Admin only); Delete button (Admin only)
   - Center panel tabbed: Overview | Vitals | Investigations | History | Prescriptions | Appointments | Pending Approvals
   - **Overview tab**: profile card with last visit summary and active problems list
   - **Vitals tab**: summary bar (latest BP, Pulse, Temp, SpO2, Weight) + recharts LineChart (date vs values, multiple colored lines for each vital)
   - **Investigations tab**: per-test recharts LineChart (date vs result), doctor can validate/edit values
   - **History tab**: existing visit history (unchanged)
   - **Prescriptions tab**: existing prescriptions (unchanged)
   - **Appointments tab**: next upcoming appointment + past appointments table
   - **Pending Approvals tab**: table (Date, Time, Type, Data, Status) of patient-submitted data; Doctor/Admin can approve/reject

3. **Patient Data Submission** section (visible when patient is logged in viewing their own profile):
   - "Update My Health" panel with tabs: Complaints | Vitals | Upload Report
   - Complaints tab: textarea for symptoms/complaints
   - Vitals tab: manual fields for BP, Pulse, Temp, SpO2, Weight + optional photo upload
   - Upload Report tab: PDF/image upload for investigation reports
   - All submissions saved to `medicare_patient_submissions` in localStorage, status: pending
   - Doctor/Admin see these in Pending Approvals tab and can approve (merges to official record) or reject

4. **Audit Log** (Admin only):
   - Stored in localStorage key `medicare_audit_log`
   - Log entry: { timestamp, userRole, userName, action, target }
   - Log events: login (who + role + timestamp), patient record edit (who + patient name)
   - Visible in Admin Tools section or a new route `/AuditLog`
   - Searchable by date/user

5. **Role-based UI visibility**:
   - Doctor: full clinical access (visits, prescriptions, vitals edit, investigations edit)
   - Staff: can register/edit patients, create appointments, view profiles — cannot add visits or write prescriptions
   - Patient: sees only their own profile/dashboard; can submit data; cannot see other patients
   - Admin: full access including delete patient and audit log

6. **Notifications**:
   - Floating badge for pending patient signups (alongside existing staff pending badge)
   - Notification dot for pending patient data submissions (in Pending Approvals tab)

### Modify

- `useEmailAuth.tsx`: Add patient accounts support (separate registry key + session key), extend sign-in to check patient registry too; extend pending approvals to include patient accounts
- `App.tsx`: Add Patient Login tab to auth dialog; route to patient's own PatientProfile when patient is logged in; add patient pending approvals to admin badge count; write audit log on every login
- `PatientProfile.tsx`: Replace with new PatientDashboard layout (left sidebar + tabbed center); preserve all existing visit/prescription/investigation functionality intact inside the History and Prescriptions tabs
- `Layout.tsx`: Hide admin/doctor-only nav items from staff and patient views

### Remove

- Nothing removed — existing patient detail content moves to tabs within the new dashboard

## Implementation Plan

1. Extend `useEmailAuth.tsx`:
   - Add `PatientAccount` interface and localStorage CRUD helpers
   - Patient signup/signin by phone number + password
   - Extend `getPendingAccounts()` to include pending patients
   - Extend `approveAccount()` / `rejectAccount()` to handle patients
   - Audit log helper functions (appendAuditLog, getAuditLog)

2. Update `App.tsx`:
   - Add Patient tab to the login dialog
   - Handle `currentPatient` state from patient session
   - When patient logged in: render PatientDashboard for their own patient record only
   - Admin pending badge counts both staff and patient pending accounts
   - Write audit log on every login/logout

3. Create `PatientDashboard.tsx` component:
   - Left sidebar with profile info, edit/delete role-gated buttons
   - Tabbed center panel with all sections
   - Vitals line chart using recharts (data from visit vitals history)
   - Per-investigation line chart using recharts
   - Pending Approvals tab with approve/reject actions
   - Patient submission panel (only when `currentPatient` is viewing their own record)

4. Create `PatientSubmissionPanel.tsx`:
   - Complaints / Vitals / Upload tabs
   - Saves to `medicare_patient_submissions` localStorage
   - Shows confirmation after submit

5. Create `AuditLog.tsx` page:
   - Read from `medicare_audit_log` localStorage
   - Table with Date, User, Role, Action, Target columns
   - Search/filter by date range or user name
   - Accessible to Admin only via route `/AuditLog`

6. Update `pages.config.ts` and router in `App.tsx` to add AuditLog route

7. Role-gate UI elements throughout:
   - Add Visit button: Doctor only
   - New Prescription button: Doctor only
   - Edit vitals/investigations: Doctor only
   - Delete patient: Admin only
   - Audit log link: Admin only
   - Patient data submission panel: Patient role only
