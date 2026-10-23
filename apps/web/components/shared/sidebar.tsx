"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronsLeft, LogOut, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { usePainAlerts } from "@/lib/hooks/pain-alerts-provider";
import { signOut } from "@/lib/auth-client";
import { findActiveHref, getNavSections } from "@/components/shared/nav-config";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Org Admin",
  coach: "Antrenör",
  athlete: "Sporcu",
};

/**
 * Görünen ad: varsa full_name, yoksa sentetik e-postanın kullanıcı adı kısmı
 * ({username}@{org_slug}.athleteiq.app — tam adres mobilde taşıyordu).
 */
export function getUserDisplay(user: User | null) {
  const fullName = user?.user_metadata?.["full_name"];
  const username = user?.email?.split("@")[0] ?? "";
  const name = typeof fullName === "string" && fullName.trim() ? fullName.trim() : username;
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toLocaleUpperCase("tr-TR"))
      .join("") || "?";
  return { name, username, initials };
}

interface SidebarProps {
  /** Mobil çekmece açık mı. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Masaüstünde yalnızca ikonlara daraltılmış mı. */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ open, onOpenChange, collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { user, role, isSuperAdmin } = useUserContext();
  const { alerts } = usePainAlerts();
  const painCount = alerts.length;

  // Sayfa değişince mobil menüyü otomatik kapat.
  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Mobil çekmece açıkken Esc ile kapat ve arka planın kaymasını engelle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const sections = getNavSections(role, isSuperAdmin);
  const activeHref = findActiveHref(
    pathname,
    sections.flatMap((s) => s.items)
  );
  const { name, initials } = getUserDisplay(user);
  // Daraltılmış görünüm yalnızca masaüstünde geçerli; mobil çekmece hep tam genişlik.
  const mini = collapsed;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "group/sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,85vw)] flex-col border-r bg-card/95 shadow-2xl backdrop-blur-xl transition-[transform,width] duration-300 ease-out",
          "md:relative md:z-auto md:h-full md:translate-x-0 md:bg-card md:shadow-none md:backdrop-blur-none",
          mini ? "md:w-[4.5rem]" : "md:w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Ana menü"
      >
        {/* Marka */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4",
            mini && "md:justify-center md:px-0"
          )}
        >
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet text-primary-foreground shadow-md shadow-primary/30">
              <Activity className="h-5 w-5" />
            </span>
            <span
              className={cn(
                "truncate text-lg font-bold tracking-tight",
                mini && "md:hidden"
              )}
            >
              Athlete<span className="text-primary">IQ</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigasyon */}
        {/* Daraltılmış modda üzerine gelince açılan ad etiketleri kesilmesin diye
            taşma görünür bırakılır (14 ikon masaüstü yüksekliğine sığar). */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:thin]",
            mini && "md:overflow-visible md:px-2"
          )}
        >
          {sections.map((section, sIdx) => (
            <div key={section.title} className={cn(sIdx > 0 && "mt-5")}>
              <p
                className={cn(
                  "mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70",
                  mini && "md:hidden"
                )}
              >
                {section.title}
              </p>
              {mini && sIdx > 0 && (
                <div className="mx-auto mb-3 hidden h-px w-8 bg-border md:block" />
              )}
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const isActive = href === activeHref;
                  const showPain = href === "/feedback" && painCount > 0;
                  return (
                    <li key={href} className="relative">
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={mini ? label : undefined}
                        className={cn(
                          "group/item relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 md:py-2",
                          mini && "md:justify-center md:px-0",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {/* Aktif öğe için sol vurgu çubuğu */}
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                            isActive ? "opacity-100" : "h-0 opacity-0"
                          )}
                          aria-hidden="true"
                        />
                        <span className="relative">
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover/item:scale-110",
                              isActive && "scale-110"
                            )}
                          />
                          {showPain && mini && (
                            <span className="absolute -right-1.5 -top-1.5 hidden h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-card md:block" />
                          )}
                        </span>
                        <span className={cn("truncate", mini && "md:hidden")}>{label}</span>
                        {/* Okunmamış ağrı bildirimi sayacı — yalnızca Geri Bildirimler
                            satırında, yalnızca 0'dan büyükse. */}
                        {showPain && (
                          <span
                            className={cn(
                              "ml-auto flex h-5 min-w-[1.25rem] animate-pulse items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white",
                              mini && "md:hidden"
                            )}
                          >
                            {painCount > 99 ? "99+" : painCount}
                          </span>
                        )}
                        {/* Daraltılmış modda üzerine gelince ad etiketi */}
                        {mini && (
                          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-all duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-100 md:block">
                            {label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Kullanıcı kartı */}
        <div className={cn("shrink-0 border-t p-3", mini && "md:px-2")}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-muted/50 p-2.5",
              mini && "md:flex-col md:gap-2 md:bg-transparent md:p-0"
            )}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet/80 text-xs font-bold text-white"
              title={mini ? name : undefined}
            >
              {initials}
            </span>
            <div className={cn("min-w-0 flex-1", mini && "md:hidden")}>
              <p className="truncate text-sm font-semibold leading-tight">{name || "—"}</p>
              {role && (
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[role] ?? role}
                  {isSuperAdmin && " · Super Admin"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Çıkış yap"
              title="Çıkış yap"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Masaüstü daralt/genişlet tutamacı */}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="absolute -right-3 top-[4.5rem] z-10 hidden h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-all hover:scale-110 hover:text-foreground md:flex md:opacity-0 md:focus-visible:opacity-100 md:group-hover/sidebar:opacity-100"
          aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        >
          <ChevronsLeft
            className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </aside>
    </>
  );
}
