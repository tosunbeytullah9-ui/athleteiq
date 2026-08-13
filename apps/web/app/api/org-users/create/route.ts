import { createClient } from "@/lib/supabase/server";
import { createOrgUserSchema } from "@athleteiq/validators";
import { NextRequest, NextResponse } from "next/server";

// supabase/functions/create-org-user'a proxy — apps/web/app/api/auth/invite/route.ts
// ile birebir aynı desen (server-side session -> Authorization header'lı fetch).
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createOrgUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${supabaseUrl}/functions/v1/create-org-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(parsed.data),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Kullanıcı oluşturulamadı" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
