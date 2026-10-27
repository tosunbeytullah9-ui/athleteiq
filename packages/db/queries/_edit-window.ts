// Düzenleme penceresi dolmuş bir kaydın upsert'ü — RLS (session_feedback_update_athlete:
// son 7 gün, wellness_update: son 1 gün) ON CONFLICT DO UPDATE dalını reddeder.
// Postgres bunu "new row violates row-level security policy (USING expression)" (42501)
// olarak yükseltir; PostgREST ise satır dönmezse `.single()` için PGRST116 verir. İkisi
// de kullanıcıya ham İngilizce hata ya da sessiz kayıp olarak düşmesin diye tek bir
// Türkçe mesaja çevrilir (Parti 18T).
export const EDIT_WINDOW_EXPIRED_MESSAGE =
  "Düzenleme süresi doldu — bu kayıt artık değiştirilemez.";

export class EditWindowExpiredError extends Error {
  constructor() {
    super(EDIT_WINDOW_EXPIRED_MESSAGE);
    this.name = "EditWindowExpiredError";
  }
}

type PgLikeError = { code?: string; message?: string };

export function isEditWindowRejection(error: PgLikeError | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true; // 0 satır güncellendi
  return error.code === "42501" && /USING expression/i.test(error.message ?? "");
}
