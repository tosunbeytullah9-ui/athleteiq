import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { id: membershipId } = await params;
  const body = (await request.json()) as { teamId?: string | null };
  const teamId = body.teamId ?? null;

  // Kullanıcıyı cookie'den doğrula
  const supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 });
  }

  // Service role ile çağıranın org/rol bilgisini bul — client'a güvenme
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const isSuperAdmin = user.user_metadata?.["platform_role"] === "super_admin";

  const { data: callerMembership } = await admin
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();

  if (!isSuperAdmin && (!callerMembership || callerMembership.role !== "admin")) {
    return NextResponse.json({ error: "Yetkisiz işlem" }, { status: 403 });
  }

  // Hedef membership aynı org'da mı?
  const { data: targetMembership } = await admin
    .from("memberships")
    .select("id, org_id")
    .eq("id", membershipId)
    .single();

  if (!targetMembership) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  if (!isSuperAdmin && targetMembership.org_id !== callerMembership?.org_id) {
    return NextResponse.json({ error: "Yetkisiz işlem" }, { status: 403 });
  }

  // Yeni takım (varsa) hedef membership ile aynı org'da mı?
  if (teamId) {
    const { data: team } = await admin
      .from("teams")
      .select("id, org_id")
      .eq("id", teamId)
      .single();

    if (!team || team.org_id !== targetMembership.org_id) {
      return NextResponse.json({ error: "Takım bu organizasyona ait değil" }, { status: 400 });
    }
  }

  const { error } = await admin
    .from("memberships")
    .update({ team_id: teamId })
    .eq("id", membershipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
