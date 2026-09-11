"use client";

import { LogOut } from "lucide-react";
import { Badge } from "@athleteiq/ui/components/badge";
import { Button } from "@athleteiq/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@athleteiq/ui/components/card";
import type { Athlete1RMRecord } from "@athleteiq/db/queries/exercises";
import type { Tables } from "@athleteiq/db/types";
import { signOut } from "@/lib/auth-client";

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground block text-xs mb-1">{label}</span>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{value}</div>
    </div>
  );
}

interface Props {
  athlete: AthleteProfile;
  maxes: Athlete1RMRecord[];
  latestTests: Tables<"test_results">[];
}

export function ProfileClient({ athlete, maxes, latestTests }: Props) {
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
          Kişisel bilgilerin ve hesap ayarların
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">{athlete.full_name}</h2>
                <Badge variant={athlete.is_active ? "default" : "secondary"}>
                  {athlete.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {[athlete.teams?.name, athlete.position].filter(Boolean).join(" · ")}
                {athlete.organizations?.name && ` · ${athlete.organizations.name}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kişisel Bilgiler</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bu bilgileri güncellemek için koçunla veya organizasyon yöneticinle iletişime geç.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Ad Soyad" value={athlete.full_name} />
              <Field
                label="Doğum Tarihi"
                value={
                  athlete.birth_date
                    ? `${new Date(athlete.birth_date).toLocaleDateString("tr-TR")} (${calculateAge(athlete.birth_date)})`
                    : "—"
                }
              />
              <Field label="Boy" value={athlete.height_cm ? `${athlete.height_cm} cm` : "—"} />
              <Field label="Kilo" value={athlete.weight_kg ? `${athlete.weight_kg} kg` : "—"} />
              <Field label="Pozisyon / Branş" value={athlete.position ?? "—"} />
              <Field
                label="Cinsiyet"
                value={athlete.gender ? GENDER_LABELS[athlete.gender] ?? athlete.gender : "—"}
              />
            </CardContent>
          </Card>

          {(maxes.length > 0 || latestTests.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kişisel Rekorlar</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {maxes.map((m) => (
                  <div key={m.id} className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-base font-bold">{m.weight_kg} kg</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.exercise_name}</p>
                  </div>
                ))}
                {latestTests.map((t) => (
                  <div key={t.id} className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-base font-bold">
                      {t.value} {t.unit ?? ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t.test_type}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hesap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {athlete.username && (
                <div className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">Kullanıcı Adı</span>
                  <span className="font-medium">{athlete.username}</span>
                </div>
              )}
              {athlete.organizations?.name && (
                <div className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">Organizasyon</span>
                  <span className="font-medium">{athlete.organizations.name}</span>
                </div>
              )}
              {athlete.teams?.name && (
                <div className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">Takım</span>
                  <span className="font-medium">{athlete.teams.name}</span>
                </div>
              )}
              {athlete.created_at && (
                <div className="flex items-center justify-between pb-0">
                  <span className="text-muted-foreground">Katılım Tarihi</span>
                  <span className="font-medium">
                    {new Date(athlete.created_at).toLocaleDateString("tr-TR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Şifre</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  Kendi kendine şifre sıfırlama kapalı
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Şifreni değiştirmek için koçuna veya organizasyon yöneticine ulaş — senin adına sıfırlarlar.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bildirimler</CardTitle>
              <Badge variant="secondary" className="text-[10px]">Yakında</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "Program yayınlandığında", desc: "Koçun yeni bir program yayınladığında bildir" },
                { title: "Müsabaka hatırlatıcıları", desc: "Yaklaşan müsabakalardan 3 gün önce" },
                { title: "Günlük wellness hatırlatması", desc: "Her sabah check-in için hatırlat" },
              ].map((row) => (
                <div key={row.title} className="flex items-center gap-3 opacity-60">
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{row.title}</p>
                    <p className="text-[11px] text-muted-foreground">{row.desc}</p>
                  </div>
                  <div className="h-5 w-9 rounded-full bg-muted relative shrink-0" aria-disabled>
                    <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Oturumu Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}
