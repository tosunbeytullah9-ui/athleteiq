import { createClient } from "@/lib/supabase/server";
import type { Database } from "@athleteiq/db/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type MembershipRow = Database["public"]["Tables"]["memberships"]["Row"];

export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Giriş yapılmamışsa login'e yönlendir
  if (!user) {
    redirect("/login");
  }

  // Super admin platform_role kontrolü
  if (user.app_metadata?.["platform_role"] === "super_admin") {
    redirect("/admin");
  }

  // Membership role'ünden yönlendirme
  const cookieStore = await cookies();
  const cachedRole = cookieStore.get("aiq_role")?.value;

  if (cachedRole) {
    return redirectByRole(cachedRole);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .single() as { data: Pick<MembershipRow, "role"> | null; error: unknown };

  if (!membership) {
    redirect("/login?error=no_membership");
  }

  return redirectByRole(membership.role);
}

function redirectByRole(role: string): never {
  switch (role) {
    case "admin":
      redirect("/dashboard");
    case "coach":
      redirect("/athletes");
    case "athlete":
      redirect("/programs");
    default:
      redirect("/login");
  }
}
