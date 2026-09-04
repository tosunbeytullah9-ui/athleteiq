import { cookies } from "next/headers";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import {
  UserContextProvider,
  type Role,
} from "@/lib/hooks/user-context-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = (cookieStore.get("aiq_role")?.value ?? null) as Role | null;
  const orgId = cookieStore.get("aiq_org_id")?.value ?? null;
  const teamId = cookieStore.get("aiq_team_id")?.value ?? null;

  return (
    <UserContextProvider value={{ role, orgId, teamId }}>
      <DashboardShell>{children}</DashboardShell>
    </UserContextProvider>
  );
}
