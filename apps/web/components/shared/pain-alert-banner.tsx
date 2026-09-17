"use client";

import Link from "next/link";
import { AlertTriangle, Bell } from "lucide-react";
import { usePainAlerts } from "@/lib/hooks/pain-alerts-provider";

/**
 * Okunmamış ağrı bildirimi varken her sayfanın üstünde duran kalıcı uyarı şeridi.
 *
 * Toast (use-toast.ts) 4 saniyede kayboluyor — bir sakatlık sinyali için bu çok
 * kısa. Kalıcı yüzey bu şerittir: koç paneli ne zaman açarsa açsın, bildirim
 * okunana kadar görünür kalır.
 */
export function PainAlertBanner() {
  const { alerts, desktopPermission, requestDesktopPermission } = usePainAlerts();

  if (alerts.length === 0) return null;

  const names = Array.from(new Set(alerts.map((a) => a.athlete_name)));
  const shown = names.slice(0, 3).join(", ");
  const rest = names.length > 3 ? ` +${names.length - 3}` : "";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-red-300 bg-red-50 px-8 py-2.5 text-sm text-red-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="font-semibold">
        {alerts.length} okunmamış ağrı bildirimi
      </span>
      <span className="text-red-700">
        {shown}
        {rest}
      </span>
      <Link
        href="/feedback"
        className="font-medium underline underline-offset-2 hover:no-underline"
      >
        İncele
      </Link>

      {desktopPermission === "default" && (
        <button
          type="button"
          onClick={() => void requestDesktopPermission()}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          title="Sekme arka plandayken de işletim sistemi bildirimi göster"
        >
          <Bell className="h-3.5 w-3.5" />
          Masaüstü bildirimi aç
        </button>
      )}
    </div>
  );
}
