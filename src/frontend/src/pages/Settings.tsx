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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, LogOut, Save, Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useEmailAuth } from "../hooks/useEmailAuth";

const DESIGNATIONS = ["Dr.", "Prof.", "Assoc. Prof.", "Mr.", "Ms.", "Mrs."];

export default function Settings() {
  const { currentDoctor, signOut, updateProfile } = useEmailAuth();

  const [name, setName] = useState(currentDoctor?.name ?? "");
  const [email] = useState(currentDoctor?.email ?? "");
  const [designation, setDesignation] = useState(
    currentDoctor?.designation ?? "Dr.",
  );
  const [degree, setDegree] = useState(currentDoctor?.degree ?? "");
  const [specialization, setSpecialization] = useState(
    currentDoctor?.specialization ?? "",
  );
  const [hospital, setHospital] = useState(currentDoctor?.hospital ?? "");
  const [phone, setPhone] = useState(currentDoctor?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    try {
      updateProfile({
        name,
        designation,
        degree,
        specialization,
        hospital,
        phone,
      });
      toast.success("Profile updated successfully");
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
            Your credentials shown across the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select value={designation} onValueChange={setDesignation}>
                <SelectTrigger data-ocid="settings.designation.select">
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
              <Label htmlFor="settings-name">Full Name</Label>
              <Input
                id="settings-name"
                placeholder="Arman Kabir"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-ocid="settings.doctor_name.input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email (read-only)</Label>
            <Input
              value={email}
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-degree">Degree / Qualifications</Label>
            <Input
              id="settings-degree"
              placeholder="MBBS, MD, FCPS"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              data-ocid="settings.doctor_degree.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-spec">Specialization</Label>
            <Input
              id="settings-spec"
              placeholder="e.g. Pulmonology, Cardiology"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              data-ocid="settings.specialization.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-hospital">Hospital / Clinic</Label>
            <Input
              id="settings-hospital"
              placeholder="Dhaka Medical College Hospital"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              data-ocid="settings.hospital.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">Phone</Label>
            <Input
              id="settings-phone"
              type="tel"
              placeholder="+880 1XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              data-ocid="settings.phone.input"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
            data-ocid="settings.doctor_profile.save_button"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Sign Out
          </CardTitle>
          <CardDescription>
            You will need to sign in again to access the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={signOut}
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
