"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerUserContext } from "@/lib/hooks/user-context-provider";
import { toast } from "@/components/ui/use-toast";
import {
  getUnreadPainFeedback,
  type PainAlertRow,
} from "@athleteiq/db/queries/session-feedback";

/**
 * Ağrı bildirimi uyarıları (Parti 22-FB-N).
 *
 * "Koç her zaman sporcunun başında olamıyor" gereksiniminin bildirim ayağı.
 * Kanal olarak **web içi anlık uyarı + kalıcı rozet** seçildi (kullanıcı kararı);
 * Expo mobil push bilinçli olarak kapsam dışı — bu projede push zinciri hiç
 * kurulmamış (`registerForPushNotifications()` stub, `expo-notifications` kurulu
 * değil, EAS projectId yok) ve token alabilmek için development build şart.
 *
 * Ayrı bir bildirim kuyruğu tablosu AÇILMADI: "okunmamış ağrı" durumu zaten
 * `session_feedback`'te (has_pain + coach_read_at is null) duruyor. İkinci bir
 * kopya, senkron tutma yükü ve tutarsızlık riski demekti.
 *
 * Üç katman:
 *   1. Kalıcı rozet/banner — sayfa yenilense de, koç o an ekranda olmasa da durur.
 *   2. Anlık toast — koç panelde açıkken yeni bildirim geldiği anda görünür.
 *   3. Masaüstü bildirimi — yalnızca sekme ARKA PLANDAYSA ve koç izin verdiyse.
 *      İzin istemi kendiliğinden açılmaz, banner'daki butondan opt-in'dir.
 */

interface PainAlertsValue {
  alerts: PainAlertRow[];
  /** Okundu/yanıt sonrası rozeti beklemeden tazelemek için. */
  refresh: () => Promise<void>;
  /** Masaüstü bildirimi izni: "unsupported" | "default" | "granted" | "denied" */
  desktopPermission: string;
  requestDesktopPermission: () => Promise<void>;
}

const Ctx = createContext<PainAlertsValue>({
  alerts: [],
  refresh: async () => {},
  desktopPermission: "unsupported",
  requestDesktopPermission: async () => {},
});

export function usePainAlerts(): PainAlertsValue {
  return useContext(Ctx);
}

export function PainAlertsProvider({ children }: { children: ReactNode }) {
  const { role } = useServerUserContext();
  // Sporcu kendi ağrı bildirimini kendisine duyurmaz — abonelik yalnızca
  // koç/admin için açılır (gereksiz realtime bağlantısı da kurulmaz).
  const enabled = role === "admin" || role === "coach";

  const [alerts, setAlerts] = useState<PainAlertRow[]>([]);
  const [desktopPermission, setDesktopPermission] = useState("unsupported");
  // İlk yükleme "yeni geldi" sayılmamalı — aksi halde her sayfa açılışında
  // bekleyen tüm bildirimler toast olarak patlar.
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setDesktopPermission(Notification.permission);
    }
  }, []);

  const notify = useCallback((rows: PainAlertRow[]) => {
    for (const row of rows) {
      const area = row.pain_area ? ` — ${row.pain_area}` : "";
      toast({
        variant: "destructive",
        title: `Ağrı bildirimi: ${row.athlete_name}`,
        description: `${area ? area.replace(" — ", "") + ". " : ""}${
          row.note ? row.note.slice(0, 120) : "Geri Bildirimler sayfasından inceleyin."
        }`,
      });

      // Toast yalnızca sekme öndeyken işe yarar; arka plandaysa işletim
      // sisteminin bildirimi devreye girer (izin verilmişse).
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(`Ağrı bildirimi: ${row.athlete_name}`, {
            body: row.pain_area ?? "Sporcu antrenmanda ağrı bildirdi.",
            tag: `pain-${row.id}`,
          });
        } catch {
          // Bildirim oluşturulamazsa sessizce geç — uyarının kendisi zaten
          // rozette ve banner'da duruyor.
        }
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await getUnreadPainFeedback(createClient());
      setAlerts(rows);

      if (seenIds.current === null) {
        seenIds.current = new Set(rows.map((r) => r.id));
        return;
      }
      const fresh = rows.filter((r) => !seenIds.current!.has(r.id));
      for (const r of rows) seenIds.current.add(r.id);
      if (fresh.length > 0) notify(fresh);
    } catch {
      // Rozet kritik değil — hata durumunda sessizce eski değerde kalır.
    }
  }, [enabled, notify]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();

    const supabase = createClient();
    const channel = supabase
      .channel("pain-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_feedback" },
        () => {
          // RLS realtime'da da geçerli: koç yalnızca kendi takımının
          // satırlarındaki değişimi alır. Payload'a güvenmek yerine listeyi
          // yeniden çekiyoruz — sporcu adı ve okundu durumu tek yerden gelsin.
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, refresh]);

  const requestDesktopPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setDesktopPermission(result);
    } catch {
      // Tarayıcı reddederse mevcut durumda kal.
    }
  }, []);

  return (
    <Ctx.Provider value={{ alerts, refresh, desktopPermission, requestDesktopPermission }}>
      {children}
    </Ctx.Provider>
  );
}
