"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/shared/brand-mark";
import { PRODUCT_NAME } from "@/lib/brand";

const LINKS = [
  { href: "#koc", label: "Koç için" },
  { href: "#sporcu", label: "Sporcu için" },
  { href: "#nasil", label: "Nasıl çalışır" },
  { href: "#kimler", label: "Kimler için" },
  { href: "#demo", label: "Demo" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-white/5 bg-background/75 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="font-display text-[17px] font-bold">{PRODUCT_NAME}</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#giris"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-white/10"
        >
          Giriş yap
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
}
