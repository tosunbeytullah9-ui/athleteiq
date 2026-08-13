"use client";

import { useRouter } from "next/navigation";
import { Users as UsersIcon } from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { CreateOrgUserModal } from "@/components/features/settings/create-org-user-modal";
import { ResetUserPasswordModal } from "@/components/features/settings/reset-user-password-modal";

interface OrgUser {
  user_id: string;
  role: string;
  team_name: string | null;
  joined_at: string | null;
  profile: { username: string; full_name: string } | null;
  email: string | null;
}

interface Props {
  orgId: string;
  orgSlug: string;
  users: OrgUser[];
  teams: { id: string; name: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Koç",
  athlete: "Sporcu",
};

export function UsersClient({ orgId, orgSlug, users, teams }: Props) {
  const router = useRouter();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kullanıcılar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organizasyonunuzdaki admin, koç ve sporcu hesaplarını yönetin.
          </p>
        </div>
        <CreateOrgUserModal
          orgId={orgId}
          orgSlug={orgSlug}
          teams={teams}
          onSuccess={() => router.refresh()}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersIcon className="h-4 w-4" />
            Tüm Kullanıcılar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
              Henüz kullanıcı yok.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {users.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {u.profile?.full_name ?? u.email ?? u.user_id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.profile?.username ? `@${u.profile.username}` : "—"}
                      {u.email ? ` · ${u.email}` : ""}
                      {u.team_name ? ` · ${u.team_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    {u.profile && (
                      <ResetUserPasswordModal
                        user={{
                          id: u.user_id,
                          full_name: u.profile.full_name,
                          username: u.profile.username,
                        }}
                        onSuccess={() => router.refresh()}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
