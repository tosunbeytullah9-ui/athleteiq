import { createClient } from "@/lib/supabase/server";
import { Badge } from "@athleteiq/ui/components/badge";
import { Card, CardContent } from "@athleteiq/ui/components/card";
import type { Tables } from "@athleteiq/db/types";

type AthleteProfile = Tables<"athletes"> & {
  teams: { name: string } | null;
  organizations: { name: string } | null;
};

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kadın",
  other: "Diğer",
};

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Oturum bulunamadı.</p>
      </div>
    );
  }

  const { data: athlete } = (await supabase
    .from("athletes")
    .select("*, teams(name), organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: AthleteProfile | null };

  if (!athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Sporcu profili bulunamadı. Koçunuzla iletişime geçin.
        </p>
      </div>
    );
  }

  const initials = athlete.full_name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bilgilerinizi güncellemek için koçunuzla veya organizasyon
          yöneticinizle iletişime geçin.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{athlete.full_name}</h2>
                <Badge variant={athlete.is_active ? "default" : "secondary"}>
                  {athlete.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              {athlete.position && (
                <p className="text-muted-foreground -mt-2">{athlete.position}</p>
              )}

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                {athlete.username && (
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Kullanıcı Adı
                    </span>
                    {athlete.username}
                  </div>
                )}
                {athlete.teams?.name && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Takım</span>
                    {athlete.teams.name}
                  </div>
                )}
                {athlete.organizations?.name && (
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Organizasyon
                    </span>
                    {athlete.organizations.name}
                  </div>
                )}
                {athlete.training_group && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Grup</span>
                    {athlete.training_group}
                  </div>
                )}
                {athlete.birth_date && (
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      Doğum Tarihi
                    </span>
                    {new Date(athlete.birth_date).toLocaleDateString("tr-TR")} (
                    {calculateAge(athlete.birth_date)})
                  </div>
                )}
                {athlete.gender && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Cinsiyet</span>
                    {GENDER_LABELS[athlete.gender] ?? athlete.gender}
                  </div>
                )}
                {athlete.height_cm && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Boy</span>
                    {athlete.height_cm} cm
                  </div>
                )}
                {athlete.weight_kg && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Kilo</span>
                    {athlete.weight_kg} kg
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {athlete.notes && (
        <Card>
          <CardContent className="pt-6">
            <span className="text-muted-foreground block text-xs mb-1">Notlar</span>
            <p className="text-sm">{athlete.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
