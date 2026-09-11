// ACWR (Akut:Kronik Yük Oranı) eşik/renk/etiket yardımcıları — acwr-client.tsx
// ve athlete-dashboard-client.tsx arasında paylaşılır. Eşikler: <0.8 düşük,
// 0.8–1.3 optimal, 1.3–1.5 dikkat, >1.5 yüksek risk (bkz. CLAUDE.md §1 ACWR).
export function getAcwrColor(ratio: number | null): string {
  if (!ratio) return "#6b7280";
  if (ratio < 0.8) return "#3b82f6";
  if (ratio <= 1.3) return "#22c55e";
  if (ratio <= 1.5) return "#f59e0b";
  return "#ef4444";
}

export function getAcwrLabel(ratio: number | null): string {
  if (!ratio) return "—";
  if (ratio < 0.8) return "Düşük";
  if (ratio <= 1.3) return "Optimal";
  if (ratio <= 1.5) return "Dikkat";
  return "Yüksek Risk";
}

export function getAcwrBadgeVariant(
  ratio: number | null
): "default" | "secondary" | "destructive" {
  if (!ratio) return "secondary";
  if (ratio <= 1.3) return "default";
  if (ratio > 1.5) return "destructive";
  return "secondary";
}
