import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { Loader2, Stethoscope } from "lucide-react";
import { motion } from "motion/react";
import Layout from "./Layout";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import PatientProfile from "./pages/PatientProfile";
import Patients from "./pages/Patients";
import Settings from "./pages/Settings";

// ── Route tree ─────────────────────────────────────────────────────

function RootLayoutComponent() {
  const state = useRouterState();
  const pathname = state.location.pathname;
  const currentPageName =
    pathname === "/" || pathname === "/Patients"
      ? "Patients"
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  patientsRoute,
  patientProfileRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── Auth screens ────────────────────────────────────────────────

function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-elevated border border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            MediCare
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Patient Management System — Please sign in to continue
          </p>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            data-ocid="login.primary_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Secure, decentralized authentication via Internet Identity
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── App root ────────────────────────────────────────────────────

function App() {
  const { identity, isInitializing } = useInternetIdentity();

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

  if (!identity) {
    return <LoginScreen />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
