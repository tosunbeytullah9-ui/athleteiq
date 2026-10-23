import {
  Users,
  CalendarRange,
  ClipboardList,
  BarChart2,
  Trophy,
  TestTube2,
  Watch,
  Settings,
  Layers,
  Sunrise,
  UserCog,
  ClipboardCheck,
  MessageSquare,
  LayoutDashboard,
  User,
  Shield,
} from "lucide-react";

export type Role = "admin" | "coach" | "athlete";

export interface NavItem {
  href: string;
  label: string;
  /** Mobil alt sekme çubuğunda kullanılan kısa ad. */
  shortLabel?: string;
  icon: typeof Users;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const COACH_SECTIONS: NavSection[] = [
  {
    title: "Genel",
    items: [
      { href: "/dashboard", label: "Dashboard", shortLabel: "Panel", icon: LayoutDashboard },
      { href: "/athletes", label: "Sporcular", icon: Users },
    ],
  },
  {
    title: "Antrenman",
    items: [
      { href: "/programs", label: "Programlar", icon: ClipboardList },
      { href: "/annual-plans", label: "Yıllık Plan", icon: CalendarRange },
      { href: "/exercises", label: "Egzersizler", icon: Layers },
      { href: "/attendance", label: "Yoklama", icon: ClipboardCheck },
    ],
  },
  {
    title: "İzleme",
    items: [
      { href: "/acwr", label: "ACWR", icon: BarChart2 },
      { href: "/feedback", label: "Geri Bildirimler", shortLabel: "Bildirim", icon: MessageSquare },
      { href: "/readiness", label: "Wellness", icon: Sunrise },
      { href: "/tests", label: "Testler", icon: TestTube2 },
      { href: "/wearables", label: "Wearable", icon: Watch },
      { href: "/competitions", label: "Yarışmalar", icon: Trophy },
    ],
  },
];

const ADMIN_SECTION: NavSection = {
  title: "Yönetim",
  items: [
    { href: "/settings/users", label: "Kullanıcılar", icon: UserCog },
    { href: "/settings", label: "Ayarlar", icon: Settings },
  ],
};

const ATHLETE_SECTIONS: NavSection[] = [
  {
    title: "Genel",
    items: [
      { href: "/dashboard", label: "Ana Sayfa", shortLabel: "Ana Sayfa", icon: LayoutDashboard },
      { href: "/programs", label: "Programlar", shortLabel: "Program", icon: ClipboardList },
      { href: "/wellness", label: "Wellness Girişi", shortLabel: "Wellness", icon: Sunrise },
      { href: "/competitions", label: "Müsabakalar", shortLabel: "Yarışma", icon: Trophy },
    ],
  },
  {
    title: "Hesap",
    items: [
      { href: "/wearables", label: "Wearable", icon: Watch },
      { href: "/profile", label: "Profil", icon: User },
    ],
  },
];

export const SUPER_ADMIN_SECTION: NavSection = {
  title: "Super Admin",
  items: [{ href: "/admin", label: "Platform Yönetimi", shortLabel: "Platform", icon: Shield }],
};

export function getNavSections(role: Role | null, isSuperAdmin: boolean): NavSection[] {
  const sections: NavSection[] =
    role === "athlete"
      ? ATHLETE_SECTIONS
      : role === "admin"
        ? [...COACH_SECTIONS, ADMIN_SECTION]
        : role === "coach"
          ? COACH_SECTIONS
          : [];
  return isSuperAdmin ? [...sections, SUPER_ADMIN_SECTION] : sections;
}

/** Mobil alt sekme çubuğundaki birincil hedefler (geri kalanı "Menü"de). */
export function getPrimaryNav(role: Role | null): NavItem[] {
  const find = (href: string) =>
    getNavSections(role, false)
      .flatMap((s) => s.items)
      .find((i) => i.href === href);
  const hrefs =
    role === "athlete"
      ? ["/dashboard", "/programs", "/wellness", "/competitions"]
      : ["/dashboard", "/athletes", "/programs", "/feedback"];
  return hrefs.map(find).filter((i): i is NavItem => Boolean(i));
}

/**
 * Aktif menü öğesi = yolu en uzun önekle eşleşen öğe. Basit `startsWith`
 * kontrolü `/settings/users`'ta hem "Kullanıcılar"ı hem "Ayarlar"ı aktif
 * gösteriyordu.
 */
export function findActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const { href } of items) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) best = href;
  }
  return best;
}
