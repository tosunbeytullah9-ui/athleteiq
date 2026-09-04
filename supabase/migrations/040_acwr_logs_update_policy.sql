-- =============================================
-- 040_acwr_logs_update_policy.sql
-- acwr_logs'ta eksik olan UPDATE politikasını ekler (003.09.2026 Eksiklikler §3).
--
-- upsertAcwrLog() (packages/db/queries/acwr.ts) .upsert(..., { onConflict:
-- "athlete_id,log_date" }) kullanıyor — aynı sporcu/tarih için ikinci bir kayıt
-- girişi (veya coach'un aynı günü düzeltmesi) ON CONFLICT DO UPDATE'e düşüyor.
-- acwr_logs'ta hiç UPDATE politikası olmadığından RLS bu dalı sessizce reddediyordu
-- (insert dalı çalıştığı için ilk giriş sorunsuz görünüyor, tekrar giriş/düzeltme
-- "kayıt çalışmıyor" olarak yaşanıyordu). wellness_checkins bu boşluğu 012_wellness.sql
-- ile kapatmıştı (bkz. o dosyadaki "acwr_logs'ta EKSİK OLAN politika" notu ve
-- packages/db/queries/wellness.ts:46-49) — acwr_logs'un kendisi hiç düzeltilmemişti.
--
-- acwr_logs'ta wellness_checkins'teki source/entered_by damgası yok, bu yüzden
-- sahiplik kontrolü doğrudan acwr_insert ile birebir aynı (sporcu kendi satırı,
-- admin org geneli, coach kendi takımı).
-- =============================================

create policy "acwr_update" on acwr_logs for update
using (
  exists (
    select 1 from athletes a
    where a.id = athlete_id
    and (
      a.user_id = auth.uid()
      or my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
)
with check (
  exists (
    select 1 from athletes a
    where a.id = athlete_id
    and (
      a.user_id = auth.uid()
      or my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id))
    )
  )
);
