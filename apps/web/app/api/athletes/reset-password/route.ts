import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// supabase/functions/reset-athlete-password'a proxy — apps/web/app/api/athletes/create-account/route.ts
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${supabaseUrl}/functions/v1/reset-athlete-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Şifre sıfırlanamadı" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
