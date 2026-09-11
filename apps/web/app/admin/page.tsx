import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@athleteiq/db/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UserRound } from "lucide-react";

type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];

export default async function SuperAdminPage() {
  const supabase = await createClient();

  const [orgsRes, usersRes, athletesRes] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, plan, created_at")
      .order("created_at", { ascending: false }),
    // is_super_admin() memberships/athletes RLS'inde org filtresiz okuma
    // izni verir (bkz. CLAUDE.md §4) — platform geneli sayım için org_id
    // filtresi yok.
    supabase.from("memberships").select("id", { count: "exact", head: true }),
    supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const orgs = orgsRes.data as Pick<
    OrgRow,
    "id" | "name" | "slug" | "plan" | "created_at"
  >[] | null;
  const planCounts = (orgs ?? []).reduce<Record<string, number>>((acc, o) => {
    const plan = o.plan ?? "free";
    acc[plan] = (acc[plan] ?? 0) + 1;
    return acc;
  }, {});

  const planVariant: Record<string, "default" | "secondary" | "outline"> = {
    enterprise: "default",
    pro: "secondary",
    free: "outline",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">
            Tüm organizasyonlar ve kullanım özetleri
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/exercises">Egzersiz Kütüphanesi</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/organizations/new">Organizasyon Ekle</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Organizasyon
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/10 text-violet">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orgs?.length ?? 0}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(planCounts).map(([plan, count]) => (
                <Badge key={plan} variant={planVariant[plan] ?? "outline"} className="text-[10px]">
                  {plan}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Toplam Kullanıcı
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{usersRes.count ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Aktif Sporcu
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-good/10 text-good">
              <UserRound className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{athletesRes.count ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organizasyon</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Oluşturulma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!orgs?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Henüz organizasyon yok.
                </TableCell>
              </TableRow>
            )}
            {orgs?.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {org.slug}
                </TableCell>
                <TableCell>
                  <Badge variant={planVariant[org.plan ?? "free"] ?? "outline"}>
                    {org.plan ?? "free"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {org.created_at ? new Date(org.created_at).toLocaleDateString("tr-TR") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
