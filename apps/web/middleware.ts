import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/auth/callback", "/auth/confirm"];
const AUTH_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  // Pathname'i downstream server component'lere ilet (layout guard kullanır)
  request.headers.set("x-pathname", request.nextUrl.pathname);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
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

  const pathname = request.nextUrl.pathname;

  // Auth route'ları (/auth/logout, /auth/callback, /auth/confirm ...) HER ZAMAN
  // geçsin — rol kontrolü ve athlete guard'dan MUAF. Supabase session yönetimi
  // (getUser + supabaseResponse cookie'leri) yukarıda zaten çalıştı; burada
  // yalnızca rol-bazlı REDIRECT atlanır. KRİTİK: athlete guard aksi halde
  // /auth/logout'u /programs'a redirect edip çıkışı sonsuz döngüye sokuyordu.
  if (pathname.startsWith("/auth/")) {
    return supabaseResponse;
  }

  // Invite sayfası her zaman erişilebilir (davet token'ı doğrulanır sayfada)
  if (pathname.startsWith("/invite")) {
    return supabaseResponse;
  }

  // Public route: giriş yapmış kullanıcıyı role'e göre yönlendir
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      const destination = getRoleDestination(
        user.user_metadata?.["platform_role"],
        request.cookies.get("aiq_role")?.value
      );
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return supabaseResponse;
  }

  // Giriş yapılmamışsa: "/" için page.tsx kendi redirect("/login")'ini
  // yapar, diğer yollar burada doğrudan login'e yönlendirilir.
  if (!user) {
    if (pathname === "/") {
      // Root page kendi redirect'ini yapıyor — geçir
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Super admin guard — /admin routes
  if (pathname.startsWith("/admin")) {
    const platformRole = user.user_metadata?.["platform_role"];
    if (platformRole !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Membership bilgisini cookie'den oku, yoksa DB'den çek ve yaz.
  // KRİTİK: cache yalnızca cookie'deki aiq_uid mevcut kullanıcıyla eşleşirse
  // geçerlidir. Aksi halde (farklı kullanıcı giriş yaptı / bayat cookie) DB'den
  // taze rol çekilir — böylece önceki kullanıcının rolü miras kalmaz.
  const cachedUid = request.cookies.get("aiq_uid")?.value;
  const cachedRole = request.cookies.get("aiq_role")?.value;
  const cachedOrgId = request.cookies.get("aiq_org_id")?.value;

  const cacheValid =
    cachedUid === user.id && Boolean(cachedRole) && Boolean(cachedOrgId);

  if (!cacheValid) {
    // Service role key ile fetch — RLS bypass, edge-compatible
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const membershipRes = await fetch(
      `${supabaseUrl}/rest/v1/memberships?user_id=eq.${user.id}&select=role,org_id,team_id&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    const membershipRows: { role: string; org_id: string; team_id: string | null }[] =
      membershipRes.ok ? await membershipRes.json() : [];
    const membership = membershipRows[0] ?? null;

    if (!membership) {
      // Üyeliği olmayan kullanıcı — login'e yönlendir
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "no_membership");
      return NextResponse.redirect(url);
    }

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 saat
    };

    supabaseResponse.cookies.set("aiq_uid", user.id, cookieOpts);
    supabaseResponse.cookies.set("aiq_role", membership.role, cookieOpts);
    supabaseResponse.cookies.set("aiq_org_id", membership.org_id, cookieOpts);
    if (membership.team_id) {
      supabaseResponse.cookies.set(
        "aiq_team_id",
        membership.team_id,
        cookieOpts
      );
    } else {
      // Yeni kullanıcının team_id'si yoksa önceki kullanıcının bayat
      // aiq_team_id cookie'sini temizle.
      supabaseResponse.cookies.set("aiq_team_id", "", {
        ...cookieOpts,
        maxAge: 0,
      });
    }
  }

  const role = supabaseResponse.cookies.get("aiq_role")?.value ?? cachedRole;

  // ATHLETE GUARD (asıl güvenlik): Sporcu web'de kendi yayınlanmış programını
  // salt-okunur görür ve kendi günlük wellness check-in'ini girer. İzin verilen
  // yollar /programs (+ [id] detay) ve /wellness. Program oluşturma/düzenleme
  // ve diğer tüm dashboard sayfaları bloklanır → /programs'a redirect.
  if (role === "athlete") {
    const isBlocked =
      pathname === "/programs/new" || pathname.endsWith("/edit");
    const isAllowed =
      (pathname.startsWith("/programs") && !isBlocked) ||
      pathname === "/wellness";

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/programs", request.url));
    }
    return supabaseResponse;
  }

  // /dashboard sadece admin rolüne açık
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (role !== "admin") {
      const dest = role === "athlete" ? "/programs" : "/athletes";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // /settings sadece admin rolüne açık
  if (pathname.startsWith("/settings")) {
    if (role !== "admin") {
      const dest = role === "athlete" ? "/programs" : "/athletes";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return supabaseResponse;
}

function getRoleDestination(
  platformRole?: string,
  membershipRole?: string
): string {
  if (platformRole === "super_admin") return "/admin";
  switch (membershipRole) {
    case "admin":
      return "/dashboard";
    case "coach":
      return "/athletes";
    case "athlete":
      return "/programs";
    default:
      return "/";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
