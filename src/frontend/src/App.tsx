import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import Layout from "./Layout";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { EmailAuthProvider, useEmailAuth } from "./hooks/useEmailAuth";
import Appointments from "./pages/Appointments";
import LandingPage from "./pages/LandingPage";
import PatientProfile from "./pages/PatientProfile";
import Patients from "./pages/Patients";
import Settings from "./pages/Settings";

// ── Route tree ──────────────────────────────────────────────────────────────────

function RootLayoutComponent() {
  const state = useRouterState();
  const pathname = state.location.pathname;
  const currentPageName =
    pathname === "/" || pathname === "/Patients"
      ? "Patients"
      : pathname === "/Appointments"
        ? "Appointments"
        : pathname.replace(/^\//, "");
  return (
    <Layout currentPageName={currentPageName}>
      <Outlet />
    </Layout>
  );
}

const rootRoute = createRootRoute({ component: RootLayoutComponent });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Patients,
});
const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/Patients",
  component: Patients,
});
const patientProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/PatientProfile",
  component: PatientProfile,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/Settings",
  component: Settings,
});
const appointmentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/Appointments",
  component: Appointments,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  patientsRoute,
  patientProfileRoute,
  settingsRoute,
  appointmentsRoute,
]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── Auth Form Content ──────────────────────────────────────────────────────

const DESIGNATIONS = ["Dr.", "Prof.", "Assoc. Prof.", "Mr.", "Ms.", "Mrs."];

function AuthScreenContent() {
  const { signIn, signUp, isLoggingIn, authError } = useEmailAuth();

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError, setSiError] = useState("");

  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suDesignation, setSuDesignation] = useState("Dr.");
  const [suDegree, setSuDegree] = useState("");
  const [suSpecialization, setSuSpecialization] = useState("");
  const [suHospital, setSuHospital] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suErrors, setSuErrors] = useState<Record<string, string>>({});

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError("");
    if (!siEmail || !siPassword) {
      setSiError("Please enter email and password.");
      return;
    }
    try {
      await signIn(siEmail, siPassword);
    } catch (err: any) {
      setSiError(err.message ?? "Sign in failed.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!suName.trim()) errs.name = "Full name is required.";
    if (!suEmail.trim()) errs.email = "Email is required.";
    if (!suPassword) errs.password = "Password is required.";
    else if (suPassword.length < 6)
      errs.password = "Password must be at least 6 characters.";
    if (suPassword !== suConfirm) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length > 0) {
      setSuErrors(errs);
      return;
    }
    setSuErrors({});
    try {
      await signUp({
        name: suName.trim(),
        email: suEmail.trim(),
        password: suPassword,
        designation: suDesignation,
        degree: suDegree.trim(),
        specialization: suSpecialization.trim(),
        hospital: suHospital.trim(),
        phone: suPhone.trim(),
      });
    } catch (err: any) {
      setSuErrors({ general: err.message ?? "Sign up failed." });
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
          <Stethoscope className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1">
          Staff Login
        </h2>
        <p className="text-muted-foreground text-sm">
          Dr. Arman Kabir&apos;s Care – Patient Management System
        </p>
      </div>

      <Tabs defaultValue="signin">
        <TabsList className="w-full mb-5">
          <TabsTrigger
            value="signin"
            className="flex-1"
            data-ocid="auth.signin.tab"
          >
            Sign In
          </TabsTrigger>
          <TabsTrigger
            value="signup"
            className="flex-1"
            data-ocid="auth.signup.tab"
          >
            Sign Up
          </TabsTrigger>
        </TabsList>

        {/* ── Sign In ── */}
        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <Input
                id="si-email"
                type="email"
                placeholder="doctor@hospital.com"
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                autoComplete="email"
                data-ocid="auth.signin.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="si-password">Password</Label>
              <Input
                id="si-password"
                type="password"
                placeholder="••••••"
                value={siPassword}
                onChange={(e) => setSiPassword(e.target.value)}
                autoComplete="current-password"
                data-ocid="auth.signin.input"
              />
            </div>
            {(siError || authError) && (
              <p
                className="text-sm text-destructive"
                data-ocid="auth.signin.error_state"
              >
                {siError || authError}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 font-semibold"
              data-ocid="auth.signin.submit_button"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </TabsContent>

        {/* ── Sign Up ── */}
        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="space-y-3">
            {suErrors.general && (
              <p
                className="text-sm text-destructive"
                data-ocid="auth.signup.error_state"
              >
                {suErrors.general}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select value={suDesignation} onValueChange={setSuDesignation}>
                  <SelectTrigger data-ocid="auth.signup.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="su-name">Full Name *</Label>
                <Input
                  id="su-name"
                  placeholder="Arman Kabir"
                  value={suName}
                  onChange={(e) => setSuName(e.target.value)}
                  data-ocid="auth.signup.input"
                />
                {suErrors.name && (
                  <p className="text-xs text-destructive">{suErrors.name}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-email">Email *</Label>
              <Input
                id="su-email"
                type="email"
                placeholder="doctor@hospital.com"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                autoComplete="email"
                data-ocid="auth.signup.input"
              />
              {suErrors.email && (
                <p className="text-xs text-destructive">{suErrors.email}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password *</Label>
                <Input
                  id="su-password"
                  type="password"
                  placeholder="Min. 6 chars"
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  autoComplete="new-password"
                  data-ocid="auth.signup.input"
                />
                {suErrors.password && (
                  <p className="text-xs text-destructive">
                    {suErrors.password}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-confirm">Confirm *</Label>
                <Input
                  id="su-confirm"
                  type="password"
                  placeholder="Repeat"
                  value={suConfirm}
                  onChange={(e) => setSuConfirm(e.target.value)}
                  autoComplete="new-password"
                  data-ocid="auth.signup.input"
                />
                {suErrors.confirm && (
                  <p className="text-xs text-destructive">{suErrors.confirm}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-degree">Degree / Qualifications</Label>
              <Input
                id="su-degree"
                placeholder="MBBS, MD, FCPS"
                value={suDegree}
                onChange={(e) => setSuDegree(e.target.value)}
                data-ocid="auth.signup.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-spec">Specialization</Label>
              <Input
                id="su-spec"
                placeholder="e.g. Pulmonology, Cardiology"
                value={suSpecialization}
                onChange={(e) => setSuSpecialization(e.target.value)}
                data-ocid="auth.signup.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-hospital">Hospital / Clinic</Label>
              <Input
                id="su-hospital"
                placeholder="Dhaka Medical College Hospital"
                value={suHospital}
                onChange={(e) => setSuHospital(e.target.value)}
                data-ocid="auth.signup.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-phone">Phone Number</Label>
              <Input
                id="su-phone"
                type="tel"
                placeholder="+880 1XXXXXXXXX"
                value={suPhone}
                onChange={(e) => setSuPhone(e.target.value)}
                data-ocid="auth.signup.input"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 font-semibold mt-1"
              data-ocid="auth.signup.submit_button"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isLoggingIn ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

function AppInner() {
  const { currentDoctor, isInitializing } = useEmailAuth();
  const { adminLogin } = useAdminAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    const ok = adminLogin(adminUser, adminPass);
    if (ok) {
      setShowAdminModal(false);
      setAdminUser("");
      setAdminPass("");
      import("sonner").then(({ toast }) => toast.success("Logged in as admin"));
    } else {
      setAdminError("Invalid admin credentials");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!currentDoctor) {
    return (
      <>
        <LandingPage
          onLoginClick={() => setShowAuthModal(true)}
          onAdminLoginClick={() => setShowAdminModal(true)}
        />
        {/* Staff Login Dialog */}
        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>Staff Login</DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AuthScreenContent />
            </motion.div>
          </DialogContent>
        </Dialog>
        {/* Admin Login Dialog */}
        <Dialog
          open={showAdminModal}
          onOpenChange={(v) => {
            setShowAdminModal(v);
            if (!v) setAdminError("");
          }}
        >
          <DialogContent className="max-w-sm" data-ocid="admin.login.dialog">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                </div>
                <DialogTitle className="text-amber-800">
                  Admin Login
                </DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter admin credentials to manage public portal content.
              </p>
            </DialogHeader>
            <form onSubmit={handleAdminLogin} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="admin-user">Username</Label>
                <Input
                  id="admin-user"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="admin1 or admin2"
                  autoComplete="username"
                  data-ocid="admin.login.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-pass">Password</Label>
                <Input
                  id="admin-pass"
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  data-ocid="admin.login.input"
                />
              </div>
              {adminError && (
                <p
                  className="text-sm text-destructive"
                  data-ocid="admin.login.error_state"
                >
                  {adminError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11 font-semibold bg-amber-600 hover:bg-amber-700"
                data-ocid="admin.login.submit_button"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Login as Admin
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default function App() {
  return (
    <EmailAuthProvider>
      <AppInner />
    </EmailAuthProvider>
  );
}
