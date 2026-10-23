import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@athleteiq/db/types";
import { Button } from "@/components/ui/button";
import { DemoRequestsClient } from "./demo-requests-client";

type DemoRequestRow = Database["public"]["Tables"]["demo_requests"]["Row"];

// /admin yalnızca süper admin'e açık (middleware); RLS de demo_requests'i
// yalnızca is_super_admin() için okutur.
export default async function DemoRequestsPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    .from("demo_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500)) as { data: DemoRequestRow[] | null };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Platform Yönetimi
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Demo Talepleri</h1>
          <p className="mt-1 text-muted-foreground">Landing sayfasındaki formdan gelen talepler</p>
        </div>
        <Button asChild>
          <Link href="/admin/organizations/new">Organizasyon Ekle</Link>
        </Button>
      </div>
      <DemoRequestsClient rows={data ?? []} />
    </div>
  );
}
