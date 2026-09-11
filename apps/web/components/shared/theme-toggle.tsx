"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// next-themes yalnızca client'ta hydrate olduktan sonra gerçek `resolvedTheme`
// değerini verir — SSR sırasında sunucu hangi temanın seçili olduğunu
// bilemez (localStorage'da). İlk render'da nötr bir iskelet göster, mount
// sonrası gerçek durumu çiz — aksi halde hydration mismatch uyarısı olur.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-0.5 rounded-full border bg-muted p-0.5">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Açık tema"
        aria-pressed={mounted && !isDark}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors",
          mounted && !isDark && "bg-background text-primary shadow-sm"
        )}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Koyu tema"
        aria-pressed={isDark}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors",
          isDark && "bg-background text-primary shadow-sm"
        )}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
