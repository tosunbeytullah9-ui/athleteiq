"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { signOut } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BrandMark } from "@/components/shared/brand-mark";
import { ROLE_LABELS, getUserDisplay } from "@/components/shared/sidebar";
import { findActiveHref, getNavSections } from "@/components/shared/nav-config";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user, role, isSuperAdmin } = useUserContext();
  const { name, initials } = getUserDisplay(user);

  // Başlık çubuğunda bulunulan bölümün adı (menüdeki etiketten türetilir).
  const items = getNavSections(role, isSuperAdmin).flatMap((s) => s.items);
  const activeHref = findActiveHref(pathname, items);
  const sectionLabel = items.find((i) => i.href === activeHref)?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card/80 px-3 backdrop-blur-xl sm:gap-3 md:h-16 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobilde marka ikonu + bölüm adı; masaüstünde yalnızca bölüm adı */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BrandMark className="h-7 w-7 md:hidden" />
        <span className="truncate text-base font-semibold tracking-tight md:text-lg">
          {sectionLabel}
        </span>
      </div>

      <ThemeToggle />

      <div className="hidden items-center gap-2.5 sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet/80 text-[11px] font-bold text-white">
          {initials}
        </span>
        <div className="hidden min-w-0 flex-col leading-tight lg:flex">
          <span className="max-w-[12rem] truncate text-sm font-medium">{name}</span>
          {role && (
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[role] ?? role}</span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        aria-label="Çıkış yap"
        className="px-2 sm:px-3"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Çıkış</span>
      </Button>
    </header>
  );
}
