"use client";

import { Activity, Calendar, Signal, Trophy, User, Wifi } from "lucide-react";

/**
 * Expo sporcu uygulamasının (apps/mobile) görünümü: durum çubuğu + alt sekme
 * çubuğu (aktif renk #534AB7, (tabs)/_layout.tsx ile aynı). 390×844.
 */
const TABS = [
  { key: "program", label: "Program", icon: Calendar },
  { key: "recovery", label: "Recovery", icon: Activity },
  { key: "competitions", label: "Yarışmalar", icon: Trophy },
  { key: "profile", label: "Profil", icon: User },
] as const;

export function MobileScreen({
  active,
  children,
  overlay,
}: {
  active: (typeof TABS)[number]["key"];
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-gray-50 font-sans text-gray-900">
      <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-7 pt-1 text-[15px] font-semibold text-white">
        <span>09:41</span>
        <span className="flex items-center gap-1.5">
          <Signal className="h-4 w-4" />
          <Wifi className="h-4 w-4" />
          <span className="h-3 w-6 rounded-[4px] border border-white/80 p-px">
            <span className="block h-full w-4/5 rounded-[2px] bg-white" />
          </span>
        </span>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
      <nav className="flex h-[84px] shrink-0 border-t border-gray-200 bg-white pb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <span
            key={key}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium"
            style={{ color: key === active ? "#534AB7" : "#9C9A92" }}
          >
            <Icon className="h-[22px] w-[22px]" />
            {label}
          </span>
        ))}
      </nav>
      {overlay}
    </div>
  );
}

export function MobileHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-blue-700 px-5 pb-6 pt-14">
      <p className="text-2xl font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-blue-200">{subtitle}</p>
    </div>
  );
}
