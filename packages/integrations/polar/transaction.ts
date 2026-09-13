import type { PolarExercise } from "./types";
import { PolarExerciseSchema } from "./types";
import { z } from "zod";

// Egzersiz transaction'ları KLASİK "AccessLink" API'sindedir (v3) — bkz.
// oauth.ts'teki not. Önceki taslak hem yanlış versiyon (v4) hem de eksik alt
// path segmentleri (liste "/exercises" ile bitmeli, commit "/commit" ile
// bitmeli) kullanıyordu; polar.com/accesslink-api/ dokümantasyonuyla çapraz
// doğrulanıp düzeltildi (2026-09-13). Transaction modeli Polar'ın kendi
// dokümantasyonunda "deprecated" işaretli ama hâlâ çalışıyor — modern
// alternatif (GET /v3/exercises, tarih aralığı filtresi olmayan bir poll
// endpoint'i) ayrı bir iş olarak değerlendirilebilir.
const BASE_URL = "https://www.polaraccesslink.com/v3";

export interface TransactionResult {
  transactionId: string;
  exercises: PolarExercise[];
}

// SIRA ZORUNLU: aç → çek → işle → commit
export async function fetchExerciseTransaction(
  accessToken: string,
  polarUserId: string
): Promise<TransactionResult | null> {
  // 1. Transaction aç
  const createRes = await fetch(
    `${BASE_URL}/users/${polarUserId}/exercise-transactions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 204 = yeni veri yok
  if (createRes.status === 204) return null;

  if (!createRes.ok) {
    throw new Error(`Polar transaction create failed: ${createRes.status}`);
  }

  const txData = (await createRes.json()) as { transaction_id: number; resource_uri: string };
  const transactionId = String(txData.transaction_id);

  // 2. Antrenmanları listele
  const listRes = await fetch(
    `${BASE_URL}/users/${polarUserId}/exercise-transactions/${transactionId}/exercises`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    throw new Error(`Polar transaction list failed: ${listRes.status}`);
  }

  const listData = (await listRes.json()) as { exercises: unknown[] };
  const exercises = z.array(PolarExerciseSchema).parse(listData.exercises ?? []);

  return { transactionId, exercises };
}

// COMMIT — önce işle, sonra commit et!
export async function commitTransaction(
  accessToken: string,
  polarUserId: string,
  transactionId: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/users/${polarUserId}/exercise-transactions/${transactionId}/commit`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Polar transaction commit failed: ${res.status}`);
  }
}
