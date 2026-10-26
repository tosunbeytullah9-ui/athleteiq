import type { Tables } from "../types";
import type { DbClient } from "./_client";

// session-feedback.ts ile aynı: metot kısayolu, supabase-js'in daraltılmış rpc()
// imzasıyla bivariant uyum için.
type RpcClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any;
};

type ImpactRpcRow = { kind: string; table_name: string; label: string; row_count: number | string };

/**
 * Uygulama içi hesap silme talepleri (account_deletion_requests,
 * 20261026185610_account_deletion_requests.sql). RLS SELECT: kişinin kendi talebi,
 * o org'un admin'i veya süper admin — koç başkasının talebini göremez. Tüm yazmalar
 * RPC'ler (request/cancel/reject) ve process-account-deletion Edge Function üzerinden.
 */
export type AccountDeletionRequest = Tables<"account_deletion_requests">;

export type AccountDeletionImpactRow = {
  kind: "delete" | "keep" | "block";
  table_name: string;
  label: string;
  row_count: number;
};

/** Kişinin en son talebi (açık, reddedilmiş, geri alınmış...) — mobil profil kartı için. */
export async function getMyLatestDeletionRequest(
  client: DbClient,
  userId: string
): Promise<AccountDeletionRequest | null> {
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function requestAccountDeletion(
  client: RpcClient,
  reason?: string
): Promise<AccountDeletionRequest> {
  const { data, error } = await client.rpc("request_account_deletion", {
    p_reason: reason,
  });
  if (error) throw error;
  return data as AccountDeletionRequest;
}

export async function cancelAccountDeletionRequest(
  client: RpcClient
): Promise<AccountDeletionRequest> {
  const { data, error } = await client.rpc("cancel_account_deletion_request");
  if (error) throw error;
  return data as AccountDeletionRequest;
}

/** Org'un bekleyen talepleri, son tarihi en yakın olan önce (admin / süper admin). */
export async function getPendingDeletionRequests(
  client: DbClient,
  orgId: string
): Promise<AccountDeletionRequest[]> {
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("due_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Rozet için yalnızca sayı — satırları çekmez. */
export async function countPendingDeletionRequests(
  client: DbClient,
  orgId: string
): Promise<number> {
  const { count, error } = await client
    .from("account_deletion_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/** Süper admin /admin özeti: org_id → bekleyen talep sayısı. */
export async function countPendingDeletionRequestsByOrg(
  client: DbClient
): Promise<Map<string, number>> {
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("org_id")
    .eq("status", "pending");
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { org_id: string }[]) counts.set(row.org_id, (counts.get(row.org_id) ?? 0) + 1);
  return counts;
}

/** Silmeden ÖNCE CASCADE etkisi — yalnızca sayısı > 0 olan satırlar döner. */
export async function getAccountDeletionImpact(
  client: RpcClient,
  requestId: string
): Promise<AccountDeletionImpactRow[]> {
  const { data, error } = await client.rpc("get_account_deletion_impact", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return ((data ?? []) as ImpactRpcRow[]).map((row) => ({
    kind: row.kind as AccountDeletionImpactRow["kind"],
    table_name: row.table_name,
    label: row.label,
    row_count: Number(row.row_count),
  }));
}

export async function rejectAccountDeletionRequest(
  client: RpcClient,
  requestId: string,
  note: string
): Promise<AccountDeletionRequest> {
  const { data, error } = await client.rpc("reject_account_deletion_request", {
    p_request_id: requestId,
    p_note: note,
  });
  if (error) throw error;
  return data as AccountDeletionRequest;
}
