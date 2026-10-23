"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { MobileTabBar } from "@/components/shared/mobile-tab-bar";
import { Toaster } from "@/components/ui/toaster";
import { PainAlertBanner } from "@/components/shared/pain-alert-banner";
import { PainAlertsProvider } from "@/lib/hooks/pain-alerts-provider";

const COLLAPSE_KEY = "aiq_sidebar_collapsed";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Masaüstü daraltma tercihi yalnızca bu tarayıcıya ait bir kolaylık.
  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* depolama kapalı — varsayılan geniş */
    }
  }, []);

  const handleCollapsedChange = useCallback((next: boolean) => {
    setIsCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* yoksay */
    }
  }, []);

  return (
    <PainAlertsProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            open={isMobileNavOpen}
            onOpenChange={setIsMobileNavOpen}
            collapsed={isCollapsed}
            onCollapsedChange={handleCollapsedChange}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setIsMobileNavOpen(true)} />
            {/* Okunmamış ağrı bildirimi şeridi — main'in DIŞINDA, yani sayfa
                kaydırılsa da görünür kalır (sporcu rolünde hiç render edilmez). */}
            <PainAlertBanner />
            {/* Mobilde alttaki sekme çubuğu içeriği örtmesin diye ek alt boşluk. */}
            <main className="flex-1 overflow-y-auto bg-background px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 md:pb-8 lg:p-8">
              {children}
            </main>
          </div>
        </div>
        <MobileTabBar onMenuClick={() => setIsMobileNavOpen(true)} />
        <Toaster />
      </div>
    </PainAlertsProvider>
  );
}
