"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserContext } from "@/lib/hooks/useUserContext";
import {
  buildDrillLookup,
  getDrillDiagrams,
  type DrillDiagramRecord,
} from "@athleteiq/db/queries/drills";

// Program oluşturucu / egzersiz seçici gibi derin client bileşenlerinde drill
// diyagramlarına erişim — her egzersiz satırına prop taşımamak için. Org başına
// tek istek (modül seviyesinde önbellek); kütüphanede kayıt/silme sonrası
// invalidateDrillLookup() çağrılır. Sporcu rolünde hiç istek atılmaz (RLS zaten
// boş döndürürdü).

const cache = new Map<string, Promise<DrillDiagramRecord[]>>();

export function invalidateDrillLookup(orgId?: string | null) {
  if (orgId) cache.delete(orgId);
  else cache.clear();
}

export function useDrillLookup(): Record<string, DrillDiagramRecord> {
  const { orgId, role } = useUserContext();
  const [lookup, setLookup] = useState<Record<string, DrillDiagramRecord>>({});
  const enabled = !!orgId && (role === "admin" || role === "coach");

  useEffect(() => {
    if (!enabled || !orgId) return;
    let cancelled = false;
    let pending = cache.get(orgId);
    if (!pending) {
      pending = getDrillDiagrams(createClient(), orgId);
      cache.set(orgId, pending);
      // Hata önbellekte kalmasın — bir sonraki bileşen yeniden denesin.
      pending.catch(() => cache.delete(orgId));
    }
    pending
      .then((records) => {
        if (!cancelled) setLookup(buildDrillLookup(records));
      })
      .catch((err) => console.error("Drill diyagramları yüklenemedi:", err));
    return () => {
      cancelled = true;
    };
  }, [enabled, orgId]);

  return lookup;
}
