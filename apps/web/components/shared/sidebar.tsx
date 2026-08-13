"use client";

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
  { href: "/athletes", label: "Sporcular", icon: Users, roles: ["admin", "coach"] },
  { href: "/programs", label: "Programlar", icon: ClipboardList, roles: ["admin", "coach", "athlete"] },
  { href: "/exercises", label: "Egzersizler", icon: Layers, roles: ["admin", "coach"] },
  { href: "/acwr", label: "ACWR", icon: BarChart2, roles: ["admin", "coach"] },
  { href: "/readiness", label: "Wellness", icon: Sunrise, roles: ["admin", "coach"] },
  { href: "/competitions", label: "Yarışmalar", icon: Trophy, roles: ["admin", "coach"] },
  { href: "/tests", label: "Testler", icon: TestTube2, roles: ["admin", "coach"] },
  { href: "/wearables", label: "Wearable", icon: Watch, roles: ["admin", "coach"] },
  { href: "/settings/users", label: "Kullanıcılar", icon: UserCog, roles: ["admin"] },
  { href: "/settings", label: "Ayarlar", icon: Settings, roles: ["admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { role, isSuperAdmin } = useUserContext();

  const visibleItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Activity className="mr-2 h-5 w-5 text-primary" />
        <span className="text-lg font-bold tracking-tight">AthleteIQ</span>
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
  );
}
