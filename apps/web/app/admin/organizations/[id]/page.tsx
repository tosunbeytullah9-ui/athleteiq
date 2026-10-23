import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditOrganizationForm } from "./edit-organization-form";

// /admin yalnızca süper admin'e açık (middleware); is_super_admin() RLS'te
// tüm org'ları ve profiles/teams/athletes satırlarını org filtresiz okutur.
export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [orgRes, usersRes, teamsRes, athletesRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, plan, logo_url, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", id),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("org_id", id),
    supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", id)
      .eq("is_active", true),
  ]);

  const org = orgRes.data;
  if (!org) notFound();

  const userCount = usersRes.count ?? 0;
  const stats = [
    { label: "Kullanıcı", value: userCount },
    { label: "Takım", value: teamsRes.count ?? 0 },
    { label: "Aktif sporcu", value: athletesRes.count ?? 0 },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Platform Yönetimi
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Oluşturulma: {org.created_at ? new Date(org.created_at).toLocaleDateString("tr-TR") : "—"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizasyon Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <EditOrganizationForm
            org={{
              id: org.id,
              name: org.name,
              slug: org.slug,
              plan: org.plan ?? "free",
              logo_url: org.logo_url ?? "",
            }}
            userCount={userCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
