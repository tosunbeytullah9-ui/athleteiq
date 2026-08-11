-- =============================================
-- 031_1rm_team_scoped_rls.sql — GÜVENLİK: athlete_1rm_records koç takım kapsamı
--
-- BULGU (BUGS.md, migration 025'in "kapsam dışı bırakılan" notu — bilinçli olarak
-- ertelenmiş, ayrı bir bulgu olarak bırakılmıştı): `1rm_insert`/`1rm_update`/
-- `1rm_delete` (005_exercises.sql) coach dalında yalnızca ORG kontrolü yapıyordu
-- (`my_role(a.org_id) in ('admin','coach')`) — `athletes`/`training_programs`'ın
-- aksine TAKIM KONTROLÜ YOKTU. Sonuç: herhangi bir coach, kendi org'undaki
-- HERHANGİ bir takımın sporcusu için 1RM kaydı ekleyebiliyor/güncelleyebiliyor/
-- silebiliyordu, yalnızca kendi takımınınkini değil.
--
-- ŞABLON: wellness_insert (012_wellness.sql) / athletes_select (002_rls.sql)
-- coach dalı: my_role(org_id) = 'coach' and team_id = my_team_id(org_id)
--
-- `1rm_select` DOKUNULMADI (görev talimatı gereği, bilinçli) — org-only okuma
-- kalıyor. Pratikte ek risk yaratmıyor: `athletes_select` coach'u zaten kendi
-- takımıyla sınırlıyor, coach başka takımın sporcu detay sayfasına RLS yüzünden
-- hiç giremiyor.
--
-- is_super_admin() dalı BİLİNÇLİ olarak eklenmedi — orijinal politikalarda hiç
-- yoktu, tek admin hesabı zaten org'da 'admin' membership'ine sahip olduğu için
-- davranış bu haliyle korunuyor.
--
-- coalesce(..., false) NOTU: 025'teki gibi burada da RLS `exists(...)` alt
-- sorgusu üç-değerli mantıkta zaten fail-CLOSED (my_team_id() NULL dönse bile
-- karşılaştırma NULL'a düşüp satırı dışlar) — coalesce gerçek bir bypass'ı
-- kapatmıyor, yalnızca proje konvansiyonuyla tutarlılık için eklendi.
--
-- MEVCUT POLİTİKALAR DÜŞÜRÜLMEDİ — ALTER POLICY ile YERİNDE güncellendi.
-- =============================================

alter policy "1rm_insert" on athlete_1rm_records with check (
  exists (
    select 1 from athletes a
    where a.id = athlete_id
    and coalesce(
      my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id)),
      false
    )
  )
);

alter policy "1rm_update" on athlete_1rm_records using (
  exists (
    select 1 from athletes a
    where a.id = athlete_id
    and coalesce(
      my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id)),
      false
    )
  )
);

alter policy "1rm_delete" on athlete_1rm_records using (
  exists (
    select 1 from athletes a
    where a.id = athlete_id
    and coalesce(
      my_role(a.org_id) = 'admin'
      or (my_role(a.org_id) = 'coach' and a.team_id = my_team_id(a.org_id)),
      false
    )
  )
);
