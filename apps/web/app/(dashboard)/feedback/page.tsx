import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrgSessionFeedback } from "@athleteiq/db/queries/session-feedback";
import { istanbulDateOffset, todayInIstanbul } from "@athleteiq/validators/date";
import { FeedbackClient } from "./feedback-client";

/**
 * Koç/admin geri bildirim akışı.
 *
 * Neden ayrı bir sayfa: geri bildirim yalnızca program detayının içine gömülürse
 * koçun oraya girmesi gerekir ve ağrı bildirimi gibi kritik sinyaller fark
 * edilmeden kalır. Bu sayfa okunmamışları ve ağrı bayraklarını öne çeker.
 *
 * RLS (session_feedback_select) coach'u kendi takımına daraltır — burada rol
 * bazlı ayrı bir sorgu yok, org filtresi athletes!inner üzerinden (bkz.
 * getOrgSessionFeedback).
 */
export default async function FeedbackPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("aiq_org_id")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Organizasyon bulunamadı.</p>
      </div>
    );
  }

  const today = todayInIstanbul();
  const fromDate = istanbulDateOffset(-30);

  const rows = await getOrgSessionFeedback(supabase, orgId, fromDate, today).catch(() => []);

  return <FeedbackClient rows={rows} from={fromDate} to={today} />;
}
