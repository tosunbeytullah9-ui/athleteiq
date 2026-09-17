"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { Toaster } from "@/components/ui/toaster";
import { PainAlertBanner } from "@/components/shared/pain-alert-banner";
import { PainAlertsProvider } from "@/lib/hooks/pain-alerts-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <PainAlertsProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuClick={() => setIsMobileNavOpen(true)} />
            {/* Okunmamış ağrı bildirimi şeridi — main'in DIŞINDA, yani sayfa
                kaydırılsa da görünür kalır (sporcu rolünde hiç render edilmez). */}
            <PainAlertBanner />
            <main className="flex-1 overflow-y-auto bg-background p-8">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </div>
    </PainAlertsProvider>
  );
}
