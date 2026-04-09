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
import {
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  LogOut,
  Save,
  Stethoscope,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useEmailAuth } from "../hooks/useEmailAuth";

const DESIGNATIONS = ["Dr.", "Prof.", "Assoc. Prof.", "Mr.", "Ms.", "Mrs."];

function ProfilePhotoUploader({
  doctorKey,
  name,
}: {
  doctorKey: "arman" | "samia";
  name: string;
}) {
  const photoStorageKey = `medicare_doctor_photo_${doctorKey}`;
  const [photo, setPhoto] = useState<string | null>(() =>
    localStorage.getItem(photoStorageKey),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .slice(1, 3)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Photo must be under 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      localStorage.setItem(photoStorageKey, dataUrl);
      setPhoto(dataUrl);
      toast.success("Profile photo updated");
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <button
          type="button"
          className="text-xs text-primary hover:underline mt-0.5"
          onClick={() => fileRef.current?.click()}
          data-ocid="settings.photo.upload_button"
        >
          {photo ? "Change photo" : "Upload photo"}
        </button>
        {photo && (
          <button
            type="button"
            className="text-xs text-destructive hover:underline mt-0.5 ml-3"
            onClick={() => {
              localStorage.removeItem(photoStorageKey);
              setPhoto(null);
              toast.success("Photo removed");
            }}
            data-ocid="settings.photo.delete_button"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

  // Derive doctor key from email
  const doctorKey: "arman" | "samia" =
    currentDoctor?.email === "samiashikder33@gmail.com" ? "samia" : "arman";

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

  // Retrieve stored password hash for display
  const storedHash = (() => {
    try {
      const registry = JSON.parse(
        localStorage.getItem("medicare_doctors_registry") || "[]",
      ) as Array<{ id: string; passwordHash?: string }>;
      const doc = registry.find((d) => d.id === currentDoctor?.id);
      if (doc?.passwordHash) {
        // Decode to get original password (base64 encoded "email::password")
        try {
          const decoded = atob(doc.passwordHash);
          const parts = decoded.split("::");
          return parts[1] || "••••••";
        } catch {
          return "••••••";
        }
      }
    } catch {}
    return "••••••";
  })();

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Account &amp; app settings
        </p>
      </div>

      {/* Profile Photo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" />
            Profile Photo
          </CardTitle>
          <CardDescription>
            Photo displayed on the public portal and in the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilePhotoUploader
            doctorKey={doctorKey}
            name={`${designation} ${name}`.trim() || "Doctor"}
          />
        </CardContent>
      </Card>

      {/* Doctor Profile card */}
      <Card>
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

      {/* Sign-in credentials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4" />
            Sign-in Credentials
          </CardTitle>
          <CardDescription>Your current login credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email / Username</Label>
            <Input
              value={email}
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={storedHash}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed font-mono text-sm pr-10"
                data-ocid="settings.password.input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                data-ocid="settings.password.toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              To change your password, contact the admin.
            </p>
          </div>
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
