"use client";

import { AlertTriangle, ChevronsLeft, LogOut, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/shared/brand-mark";
import { PRODUCT_NAME } from "@/lib/brand";
import { findActiveHref, getNavSections, type Role } from "@/components/shared/nav-config";

/**
 * Panel iskeletinin (Sidebar + Header + ağrı şeridi) statik kopyası. Menü
 * öğeleri gerçek nav-config'ten gelir — kayıtta görünen menü üründekiyle aynı.
 * Etkileşim yok; yalnızca landing kayıtları için.
 */
export function ReplicaShell({
  role,
  pathname,
  user,
  painNames,
  children,
}: {
  role: Role;
  pathname: string;
  user: { name: string; initials: string; role: string };
  painNames?: string[];
  children: React.ReactNode;
}) {
  const sections = getNavSections(role, false);
  const items = sections.flatMap((s) => s.items);
  const activeHref = findActiveHref(pathname, items);
  const sectionLabel = items.find((i) => i.href === activeHref)?.label ?? "";
  const painCount = painNames?.length ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="relative flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <BrandMark className="h-8 w-8" />
          <span className="text-base font-bold tracking-tight">{PRODUCT_NAME}</span>
        </div>
        <nav className="flex-1 overflow-hidden px-3 py-4">
          {sections.map((section, sIdx) => (
            <div key={section.title} className={cn(sIdx > 0 && "mt-5")}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const isActive = href === activeHref;
                  const showPain = href === "/feedback" && painCount > 0;
                  return (
                    <li key={href}>
                      <span
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "scale-110")} />
                        <span className="truncate">{label}</span>
                        {showPain && (
                          <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                            {painCount}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t p-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet/80 text-xs font-bold text-white">
              {user.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <span className="absolute -right-3 top-[4.5rem] hidden h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </span>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card/80 px-6">
          <span className="flex-1 truncate text-lg font-semibold tracking-tight">{sectionLabel}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground">
            <Moon className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet/80 text-[11px] font-bold text-white">
            {user.initials}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.role}</span>
          </div>
          <span className="flex items-center gap-2 px-3 text-sm font-medium">
            <LogOut className="h-4 w-4" />
            Çıkış
          </span>
        </header>
        {painCount > 0 && (
          <div className="flex items-center gap-x-3 border-b border-red-300 bg-red-50 px-8 py-2.5 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{painCount} okunmamış ağrı bildirimi</span>
            <span className="truncate text-red-700">{painNames?.join(", ")}</span>
            <span className="font-medium underline underline-offset-2">İncele</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-background p-8">{children}</main>
      </div>
    </div>
  );
}
