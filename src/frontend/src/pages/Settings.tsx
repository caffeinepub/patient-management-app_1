import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, LogOut, Shield, UserCircle } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserRole } from "../hooks/useQueries";

export default function Settings() {
  const { identity, clear } = useInternetIdentity();
  const { data: role, isLoading: loadingRole } = useGetCallerUserRole();

  const principal = identity?.getPrincipal().toString() ?? "—";

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

      {/* Profile card */}
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
