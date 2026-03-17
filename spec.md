# Dr. Arman Kabir's Care

## Current State
Uses Internet Identity for auth. Single doctor profile in localStorage. No multi-doctor support.

## Requested Changes (Diff)

### Add
- Email/password doctor Sign Up with: full name, email, password, designation, degree, specialization, hospital, phone
- Email/password Sign In screen with tabs
- Multi-doctor accounts stored in localStorage (medicare_doctors_registry)
- Custom useEmailAuth hook replacing useInternetIdentity

### Modify
- App.tsx: Replace login screen with Sign In / Sign Up tabs
- Layout.tsx: Read doctor name/degree from active session
- Settings.tsx: Show/edit full doctor profile fields
- Data namespaced per doctor email so each doctor sees own patients

### Remove
- Internet Identity login button from UI

## Implementation Plan
1. Create useEmailAuth.tsx context+hook (signUp, signIn, signOut, currentDoctor)
2. Update App.tsx with new AuthScreen (Sign In/Sign Up tabs)
3. Update Layout.tsx and Settings.tsx to use new hook
4. Namespace localStorage data keys per doctor email
