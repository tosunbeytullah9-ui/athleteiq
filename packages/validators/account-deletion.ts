import { z } from "zod";

/**
 * Uygulama içi hesap silme talebi (Parti 18B — App Store 5.1.1(v) + KVKK m.11/13).
 * Sınırlar account_deletion_requests tablosunun check constraint'leriyle ve
 * request/reject RPC'lerinin doğrulamasıyla aynıdır
 * (20261026185610_account_deletion_requests.sql) — web + mobil TEK kaynak.
 */

export const ACCOUNT_DELETION_STATUSES = ["pending", "completed", "cancelled", "rejected"] as const;
export type AccountDeletionStatus = (typeof ACCOUNT_DELETION_STATUSES)[number];

export const ACCOUNT_DELETION_STATUS_LABELS: Record<AccountDeletionStatus, string> = {
  pending: "Beklemede",
  completed: "Tamamlandı",
  cancelled: "Geri alındı",
  rejected: "Reddedildi",
};

/** KVKK m.13: talep en geç 30 gün içinde sonuçlandırılır (RPC due_at'i buna göre yazar). */
export const ACCOUNT_DELETION_DUE_DAYS = 30;
/** Kalan gün bu değere eşit veya altındaysa admin listesinde kırmızı gösterilir. */
export const ACCOUNT_DELETION_URGENT_DAYS = 7;
export const ACCOUNT_DELETION_REASON_MAX = 500;
export const ACCOUNT_DELETION_NOTE_MAX = 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Son tarihe kalan TAM gün sayısı (yukarı yuvarlanır: 2,1 gün → 3). Son tarih geçtiyse
 * 0 veya negatif döner — admin listesinde "gecikti" olarak gösterilir.
 */
export function daysUntilDue(dueAt: string | Date, now: Date = new Date()): number {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const days = Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
  // Math.ceil(-0,04) = -0 — arayüzde "-0 gün" görünmesin.
  return days === 0 ? 0 : days;
}

export function isDeletionUrgent(daysLeft: number): boolean {
  return daysLeft <= ACCOUNT_DELETION_URGENT_DAYS;
}

/** Kullanıcının opsiyonel notu — boş string "not yok" sayılır (RPC'ye null gider). */
export const accountDeletionReasonSchema = z
  .string()
  .trim()
  .max(ACCOUNT_DELETION_REASON_MAX, `Not en fazla ${ACCOUNT_DELETION_REASON_MAX} karakter olabilir`)
  .optional()
  .transform((v) => (v ? v : undefined));

/** Admin'in red gerekçesi — zorunlu (DB check: status='rejected' ise admin_note dolu). */
export const accountDeletionRejectNoteSchema = z
  .string()
  .trim()
  .min(1, "Red gerekçesi zorunludur")
  .max(ACCOUNT_DELETION_NOTE_MAX, `Gerekçe en fazla ${ACCOUNT_DELETION_NOTE_MAX} karakter olabilir`);

/**
 * GitHub tarzı kalıcı silme onayı: admin hedefin kullanıcı adını yazmalı. Baştaki/sondaki
 * boşluk tolere edilir, büyük-küçük harf farkı TOLERE EDİLMEZ (yanlış kişiyi silmeye karşı
 * bilinçli sürtünme). Kullanıcı adı bilinmiyorsa (eski hesap) onay hiçbir zaman geçmez.
 */
export function deletionConfirmationMatches(typed: string, username: string | null): boolean {
  if (!username) return false;
  return typed.trim() === username;
}
