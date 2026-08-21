"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Calendar,
  ClipboardList,
  BarChart2,
  Trophy,
  TestTube2,
  Watch,
  Settings,
  Shield,
  Activity,
  Layers,
  Sunrise,
  UserCog,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/lib/hooks/useUserContext";

type Role = "admin" | "coach" | "athlete";

const navItems: {
  href: string;
  label: string;
  icon: typeof Users;
  roles: Role[];
}[] = [
  {
    href: "/athletes",
    label: "Sporcular",
    icon: Users,
    roles: ["admin", "coach"],
  },
  {
    href: "/programs",
    label: "Programlar",
    icon: ClipboardList,
    roles: ["admin", "coach", "athlete"],
  },
  {
    href: "/exercises",
    label: "Egzersizler",
    icon: Layers,
    roles: ["admin", "coach"],
  },
  { href: "/acwr", label: "ACWR", icon: BarChart2, roles: ["admin", "coach"] },
  {
    href: "/readiness",
    label: "Wellness",
    icon: Sunrise,
    roles: ["admin", "coach"],
  },
  {
    href: "/competitions",
    label: "Yarışmalar",
    icon: Trophy,
    roles: ["admin", "coach"],
  },
  {
    href: "/tests",
    label: "Testler",
    icon: TestTube2,
    roles: ["admin", "coach"],
  },
  {
    href: "/wearables",
    label: "Wearable",
    icon: Watch,
    roles: ["admin", "coach"],
  },
  {
    href: "/settings/users",
    label: "Kullanıcılar",
    icon: UserCog,
    roles: ["admin"],
  },
  { href: "/settings", label: "Ayarlar", icon: Settings, roles: ["admin"] },
];

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname();
  const { role, isSuperAdmin } = useUserContext();

  // Sayfa değişince mobil menüyü otomatik kapat.
  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out",
          "md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">AthleteIQ</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleItems.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {isSuperAdmin && (
            <div className="mt-6">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Super Admin
              </p>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Shield className="h-4 w-4" />
                Platform Yönetimi
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t px-3 py-4">
          <p className="px-3 text-xs text-muted-foreground">AthleteIQ © 2026</p>
        </div>
      </aside>
    </>
  );
}
