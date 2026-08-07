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

type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];

export default async function SuperAdminPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, created_at")
    .order("created_at", { ascending: false }) as { data: Pick<OrgRow, "id" | "name" | "slug" | "plan" | "created_at">[] | null };

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
            Super Admin — Organizasyonlar
          </h1>
          <p className="text-muted-foreground mt-1">
            Platformdaki tüm tenant&apos;lar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/exercises">Egzersiz Kütüphanesi</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/organizations/new">Yeni Organizasyon</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
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
