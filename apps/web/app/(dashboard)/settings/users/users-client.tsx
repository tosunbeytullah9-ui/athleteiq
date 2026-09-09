"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users as UsersIcon, Trash2 } from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import { CreateOrgUserModal } from "@/components/features/settings/create-org-user-modal";
import { EditOrgUserModal } from "@/components/features/settings/edit-org-user-modal";
import { DeleteOrgUserDialog } from "@/components/features/settings/delete-org-user-dialog";
import { ResetUserPasswordModal } from "@/components/features/settings/reset-user-password-modal";
import { useUserContext } from "@/lib/hooks/useUserContext";
import { toast } from "@/components/ui/use-toast";

interface OrgUser {
  membership_id: string;
  user_id: string;
  role: string;
  team_id: string | null;
  team_name: string | null;
  joined_at: string | null;
  profile: { username: string; full_name: string } | null;
  email: string | null;
  isSuperAdmin: boolean;
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

function CoachTeamSelect({
  membershipId,
  teamId,
  teams,
  onSuccess,
}: {
  membershipId: string;
  teamId: string | null;
  teams: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextTeamId = e.target.value || null;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/memberships/${membershipId}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: nextTeamId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Takım ataması güncellenemedi");
      onSuccess();
    } catch (err: unknown) {
      toast({
        title: "Takım ataması güncellenemedi",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <select
      value={teamId ?? ""}
      onChange={handleChange}
      disabled={isSaving}
      className="flex h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      <option value="">Takımsız</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

export function UsersClient({ orgId, orgSlug, users, teams }: Props) {
  const router = useRouter();
  const { user: currentUser } = useUserContext();
  const [deleteTarget, setDeleteTarget] = useState<OrgUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/org-users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: deleteTarget.user_id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Kullanıcı silinemedi");
      toast({ title: "Kullanıcı silindi" });
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: "Silme başarısız",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

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
                    {u.isSuperAdmin && (
                      <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                        Süper Admin
                      </Badge>
                    )}
                    {u.role === "coach" && (
                      <CoachTeamSelect
                        membershipId={u.membership_id}
                        teamId={u.team_id}
                        teams={teams}
                        onSuccess={() => router.refresh()}
                      />
                    )}
                    {u.profile && (
                      <>
                        <ResetUserPasswordModal
                          user={{
                            id: u.user_id,
                            full_name: u.profile.full_name,
                            username: u.profile.username,
                          }}
                          onSuccess={() => router.refresh()}
                        />
                        {!u.isSuperAdmin && (
                          <EditOrgUserModal
                            user={{
                              id: u.user_id,
                              full_name: u.profile.full_name,
                              username: u.profile.username,
                            }}
                            onSuccess={() => router.refresh()}
                          />
                        )}
                      </>
                    )}
                    {u.profile && !u.isSuperAdmin && u.user_id !== currentUser?.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Kullanıcıyı sil"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {deleteTarget && (
        <DeleteOrgUserDialog
          fullName={deleteTarget.profile?.full_name ?? deleteTarget.email ?? "Kullanıcı"}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
