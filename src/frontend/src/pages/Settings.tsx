import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  LogOut,
  Save,
  Shield,
  Stethoscope,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserRole } from "../hooks/useQueries";

const DOCTOR_PROFILE_KEY = "doctor_profile";

function loadDoctorProfile(): { name: string; degree: string } {
  try {
    const raw = localStorage.getItem(DOCTOR_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", degree: "" };
}

export default function Settings() {
  const { identity, clear } = useInternetIdentity();
  const { data: role, isLoading: loadingRole } = useGetCallerUserRole();

  const principal = identity?.getPrincipal().toString() ?? "—";

  const [doctorName, setDoctorName] = useState(() => loadDoctorProfile().name);
  const [doctorDegree, setDoctorDegree] = useState(
    () => loadDoctorProfile().degree,
  );
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = () => {
    setSaving(true);
    try {
      localStorage.setItem(
        DOCTOR_PROFILE_KEY,
        JSON.stringify({
          name: doctorName.trim(),
          degree: doctorDegree.trim(),
        }),
      );
      toast.success("Doctor profile saved successfully");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Account &amp; app settings
        </p>
      </div>

      {/* Doctor Profile card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="w-4 h-4" />
            Doctor Profile
          </CardTitle>
          <CardDescription>
            Your name and qualifications shown in the app header
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doctor-name">Doctor Name</Label>
            <Input
              id="doctor-name"
              placeholder="Dr. Arman Kabir"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              data-ocid="settings.doctor_name.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doctor-degree">Degree / Qualification</Label>
            <Input
              id="doctor-degree"
              placeholder="MBBS, MD, FCPS"
              value={doctorDegree}
              onChange={(e) => setDoctorDegree(e.target.value)}
              data-ocid="settings.doctor_degree.input"
            />
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="gap-2"
            data-ocid="settings.doctor_profile.save_button"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Identity card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="w-4 h-4" />
            Identity
          </CardTitle>
          <CardDescription>Your Internet Identity credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Principal</p>
            <p className="text-sm font-mono bg-muted rounded-md px-3 py-2 break-all select-all">
              {principal}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Role</p>
            {loadingRole ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-md px-2.5 py-1 font-medium capitalize">
                <Shield className="w-3.5 h-3.5" />
                {role ?? "—"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sign out card */}
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Sign Out
          </CardTitle>
          <CardDescription>
            You will need to authenticate again to access the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={clear}
            className="gap-2"
            data-ocid="settings.delete_button"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-8">
        © {new Date().getFullYear()}. Built with ❤ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
