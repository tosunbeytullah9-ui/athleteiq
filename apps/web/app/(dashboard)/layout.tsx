import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { countPendingDeletionRequests } from "@athleteiq/db/queries";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import {
  UserContextProvider,
  type Role,
} from "@/lib/hooks/user-context-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = (cookieStore.get("aiq_role")?.value ?? null) as Role | null;
  const orgId = cookieStore.get("aiq_org_id")?.value ?? null;
  const teamId = cookieStore.get("aiq_team_id")?.value ?? null;

  // Defans-in-depth: middleware athlete'i zaten /dashboard + /programs +
  // /wellness + /competitions + /profile + /wearables'e kilitliyor, ama
  // server component'te de rolü doğrula. Athlete sadece /dashboard (Ana
  // Sayfa), /programs, /programs/[id] (salt-okunur), /wellness,
  // /competitions, /profile ve /wearables görebilir; new/import/edit ve
  // diğer sayfalar bloklı.
  if (role === "athlete") {
    const headerStore = await headers();
    const pathname = headerStore.get("x-pathname") ?? "";
    if (pathname) {
      const isBlocked =
        pathname === "/programs/new" ||
        pathname.startsWith("/programs/new/") ||
        pathname === "/programs/import" ||
        pathname.endsWith("/edit");
      const isAllowed =
        pathname === "/dashboard" ||
        (pathname.startsWith("/programs") && !isBlocked) ||
        pathname === "/wellness" ||
        pathname === "/competitions" ||
        pathname === "/profile" ||
        pathname === "/wearables";
      if (!isAllowed) {
        redirect("/dashboard");
      }
    }
  }

  // "Kullanıcılar" menüsündeki açık hesap silme talebi rozeti (Parti 18B). Yalnızca
  // admin — /settings/users zaten admin'e açık; RLS de yalnızca admin/süper admin'e
  // gösterir. Realtime yok, sayfa yüklemesinde (ve router.refresh'te) sayılır.
  let pendingDeletionCount = 0;
  if (role === "admin" && orgId) {
    try {
      pendingDeletionCount = await countPendingDeletionRequests(await createClient(), orgId);
    } catch {
      pendingDeletionCount = 0;
    }
  }

  return (
    <UserContextProvider value={{ role, orgId, teamId, pendingDeletionCount }}>
      <DashboardShell>{children}</DashboardShell>
    </UserContextProvider>
  );
}
