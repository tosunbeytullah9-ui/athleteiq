import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/shared/dashboard-shell";
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

  // Defans-in-depth: middleware athlete'i zaten /programs'a kilitliyor,
  // ama server component'te de rolü doğrula. Athlete sadece /programs ve
  // /programs/[id] (salt-okunur) görebilir; new/edit ve diğer sayfalar bloklı.
  if (role === "athlete") {
    const headerStore = await headers();
    const pathname = headerStore.get("x-pathname") ?? "";
    if (pathname) {
      const isBlocked =
        pathname === "/programs/new" || pathname.endsWith("/edit");
      const isAllowed = pathname.startsWith("/programs") && !isBlocked;
      if (!isAllowed) {
        redirect("/programs");
      }
    }
  }

  return (
    <UserContextProvider value={{ role, orgId, teamId }}>
      <DashboardShell>{children}</DashboardShell>
    </UserContextProvider>
  );
}
