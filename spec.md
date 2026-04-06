# Dr. Arman Kabir's Care

## Current State
The app is at version 62 and has accumulated features from versions 59-62 including:
- Patient complaint log with timestamped entries
- Drug reminder bell (patient portal only)
- Advice tab in patient profile
- Profile update requests (patient can request changes, doctor approves)
- BigInt error fix attempts
- Blank screen crash fix attempts

However the app is not working (blank screen or runtime errors). The user wants to restore version 58 stability.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Fix all runtime crashes and blank screen issues
- Ensure patient sign-in shows their own dashboard correctly
- Fix BigInt conversion errors (`Cannot convert '4' to a BigInt`)
- Fix patient portal rendering (PatientPortalView should find patient by register number reliably)
- Ensure all tabs in patient dashboard render properly
- Fix PatientProfileWrapper to correctly load patient by URL param

### Remove
- Any broken code paths introduced in versions 59-62 that cause crashes

## Implementation Plan
1. Audit App.tsx for runtime crash points in patient portal
2. Fix PatientPortalView - robust BigInt conversion with fallback
3. Fix PatientDashboard - ensure it handles null patientId gracefully
4. Fix PatientProfile - ensure useSearch and BigInt conversion is safe
5. Fix all places where BigInt conversion could fail with error boundary or try/catch
6. Ensure patient login flow works end to end
7. Validate and build
