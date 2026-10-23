"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { usePainAlerts } from "@/lib/hooks/pain-alerts-provider";
import { findActiveHref, getPrimaryNav } from "@/components/shared/nav-config";

/**
 * Telefonlarda ekranın altına sabitlenen uygulama tarzı sekme çubuğu: rolün en
 * sık kullandığı 4 sayfa + tam menüyü (çekmece) açan "Menü" düğmesi.
 * Başparmakla erişilebilir alanda olduğu için hamburger menüye göre çok daha
 * hızlı; md ve üstünde gizlenir (orada kalıcı sidebar var).
 */
export function MobileTabBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { role } = useUserContext();
  const { alerts } = usePainAlerts();
  const items = getPrimaryNav(role);
  const activeHref = findActiveHref(pathname, items);

  if (items.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Hızlı menü"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {items.map(({ href, label, shortLabel, icon: Icon }) => {
          const isActive = href === activeHref;
          const showPain = href === "/feedback" && alerts.length > 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300",
                    isActive ? "bg-primary/15" : "bg-transparent"
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                  {showPain && (
                    <span className="absolute right-2 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-card">
                      {alerts.length > 9 ? "9+" : alerts.length}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1">{shortLabel ?? label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground active:text-foreground"
          >
            <span className="flex h-8 w-14 items-center justify-center rounded-full">
              <Menu className="h-5 w-5" />
            </span>
            Menü
          </button>
        </li>
      </ul>
    </nav>
  );
}
