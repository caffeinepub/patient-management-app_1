import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Stethoscope, UserCircle, Users, X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  currentPageName: string;
}

const navigation = [
  { name: "Patients", href: "/Patients", icon: Users },
  { name: "Settings", href: "/Settings", icon: UserCircle },
];

export default function Layout({ children, currentPageName }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const state = useRouterState();
  const pathname = state.location.pathname;

  const isActive = (name: string) => {
    if (name === "Patients") {
      return (
        currentPageName === "Patients" ||
        currentPageName === "PatientProfile" ||
        pathname === "/" ||
        pathname === "/Patients"
      );
    }
    return currentPageName === name || pathname === `/${name}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 md:pb-0">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/Patients"
              className="flex items-center gap-3 group"
              data-ocid="nav.patients_link"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:bg-primary/90 transition-colors">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <p className="font-display font-bold text-foreground text-base leading-none">
                  MediCare
                </p>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">
                  Patient Management
                </p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href as any}
                  data-ocid={`nav.${item.name.toLowerCase()}_link`}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-9 px-4 text-sm font-medium gap-2",
                      isActive(item.name)
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-9 h-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile dropdown nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="p-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href as any}
                  onClick={() => setMobileMenuOpen(false)}
                  data-ocid={`nav.${item.name.toLowerCase()}_link`}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-10 gap-3",
                      isActive(item.name)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="hidden md:block border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <p className="text-xs text-muted-foreground text-center">
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
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-14">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href as any}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors",
                isActive(item.name) ? "text-primary" : "text-muted-foreground",
              )}
              data-ocid={`nav.${item.name.toLowerCase()}_link`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
