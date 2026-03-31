# Dr. Arman Kabir's Care

## Current State

- Patient sign-up is in `useEmailAuth.tsx` via `patientSignUp()`. It already verifies register number exists in patient records but also requires name, age, gender fields.
- Register number format: currently generated as `REG-0001/26` in some places, but the last confirmed requirement was `0001/26` (zero-padded 4 digits + `/` + 2-digit year).
- No per-patient sign-up toggle exists. Any patient with a valid register number can attempt to sign up.
- No admin/doctor credential editing exists for patients.
- Patient auth is stored in `medicare_patients_auth_registry` in localStorage.
- Patient profile dashboard is in `PatientDashboard.tsx` and `PatientProfile.tsx`.

## Requested Changes (Diff)

### Add
- **Per-patient sign-up toggle** in `PatientDashboard.tsx`: Doctor/admin can flip an "Allow Patient Sign-Up" toggle per patient. Default: OFF. Stored in localStorage as `medicare_patient_signup_enabled_{patientId}` or in a single map.
- **Account Settings section** in `PatientDashboard.tsx`: Admin and doctor can see patient's linked mobile number and reset/change their password. Shows mobile number field + new password field + save button. Only patient credentials can be changed, not staff/doctor.
- **Sign-up enabled check** in `patientSignUp()`: After verifying register number exists, also check if sign-up is enabled for that patient. If not, block with message: "Your account sign-up has not been activated. Please contact the clinic."

### Modify
- **Simplified patient sign-up form**: The patient sign-up form in `LandingPage.tsx` (or wherever it's rendered) should ask only for: Register Number + Mobile Number + Password. Remove: Name, Age, Gender fields. The system auto-fills name/age/gender from the matched patient record after verifying the register number.
- **`patientSignUp()` in `useEmailAuth.tsx`**: Update to accept only `{ registerNumber, phone, password }`. After verifying the register number exists AND sign-up is enabled, look up the patient record, auto-fill name/age/gender from it, then create the account linked to that patient.
- **Register number format**: Ensure all new patient registrations generate register numbers in `0001/26` format (zero-padded 4 digits + `/` + last 2 digits of current year). Update `PatientForm.tsx` register number generation logic.
- **`approvePatient()` / `rejectPatient()`**: Update to also update the linked patient record's sign-up status.

### Remove
- Name, Age, Gender fields from the patient sign-up form (auto-populated from patient record instead).

## Implementation Plan

1. **`useEmailAuth.tsx`**: Update `patientSignUp()` signature to `{ registerNumber, phone, password }`. Add sign-up enabled check. Auto-fill name/age/gender from matched patient record. Add `updatePatientCredentials(patientId: string, phone?: string, password?: string)` function exposed in context.
2. **`LandingPage.tsx` (or signup modal)**: Simplify patient sign-up form to only show Register Number + Mobile Number + Password fields.
3. **`PatientDashboard.tsx`**: Add "Account Settings" section (visible to doctor/admin only) with editable mobile and password reset for the linked patient account. Add "Allow Sign-Up" toggle visible to doctor/admin.
4. **`PatientForm.tsx`**: Ensure register number auto-generation uses `0001/26` format.
5. **Sign-up enabled state**: Store per-patient sign-up toggle in localStorage key `medicare_patient_signup_map` as `Record<string, boolean>` (keyed by register number).
