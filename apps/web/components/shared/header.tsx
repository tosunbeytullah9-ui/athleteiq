"use client";

import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@athleteiq/ui/components/button";
import { useUserContext } from "@/lib/hooks/useUserContext";

const ROLE_LABELS: Record<string, string> = {
  admin: "Org Admin",
  coach: "Antrenör",
  athlete: "Sporcu",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, role } = useUserContext();

  async function handleSignOut() {
    // Server-side logout: hem Supabase oturumunu hem httpOnly aiq_* cookie'lerini
    // temizler. Ardından hard navigation ile temiz bir istek yapılır. finally ile
    // fetch hata verse bile kullanıcı login'e yönlendirilir.
    try {
      const res = await fetch("/auth/logout", { method: "POST" });
      console.log("Logout:", res.status);
    } catch (e) {
      console.error(e);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="flex h-16 items-center justify-end border-b bg-card px-4 gap-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="mr-auto text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{user?.email}</span>
        {role && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {ROLE_LABELS[role] ?? role}
          </span>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" />
        Çıkış
      </Button>
    </header>
  );
}
