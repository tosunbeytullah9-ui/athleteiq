/**
 * organizations UPDATE hatalarını kullanıcıya gösterilecek Türkçe metne çevirir.
 * Slug kilidi ve plan/slug yetkisi DB trigger'ında (protect_org_admin_fields)
 * zaten Türkçe mesajla raise edilir; unique ihlali ise Postgres kodundan tanınır.
 */
export function orgUpdateErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  if (e?.code === "23505") return "Bu slug başka bir organizasyonda kullanılıyor, farklı bir slug seçin.";
  return e?.message || "Organizasyon güncellenemedi.";
}
