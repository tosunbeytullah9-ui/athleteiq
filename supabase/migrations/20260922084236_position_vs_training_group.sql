-- =============================================
-- 044_position_vs_training_group.sql — Mevki / Branş / Antrenman Grubu ayrımı
-- (2026-09-22)
--
-- SORUN: `athletes.position` UI'da "Pozisyon / Branş" etiketiyle sunuluyordu ve
-- bu iki anlamı birbirine karıştırıyordu. Canlı veride SONUÇ: 13 sporcunun
-- 12'sinde `position` yalnızca takımın branşını tekrar ediyordu
-- ("ARTİSTİK CİMNASTİK", "Amerikan Futbolu") — yani `teams.discipline`'ın
-- kopyası. Gerçek MEVKİ bilgisi ise gidecek yeri olmadığı için
-- `training_group`'a yazılmıştı (Koç Rams: "TE", "Linebacker", "RB").
--
-- KARAR (kullanıcı onaylı, 2026-09-22):
--   * Branş  = `teams.discipline` — TEK KAYNAK. Sporcu başına ayrı branş
--     girdisi YOK, UI takımın branşını türetip gösterir.
--   * Mevki  = `athletes.position` — serbest metin, bilgi amaçlı (TE, RB, OT).
--     Görünürlüğe doğrudan etkisi yoktur (aşağıdaki fallback hariç).
--   * Grup   = `athletes.training_group` — program görünürlüğünü daraltan kova;
--     birden çok mevkiyi kapsayabilir ("Hücum Hattı" = OL + TE).
--
-- FALLBACK: Koçun aynı değeri iki kez yazmasını önlemek için, bir programın
-- grubu sporcunun grubuna VEYA mevkisine eşleşirse sporcu programı görür. Yani
-- grup boş bırakılan sporcu için mevki fiilen grup görevi görür; grubu dolu olan
-- sporcu ise HEM grubuyla HEM mevkisiyle eşleşebilir (coalesce DEĞİL, OR).
-- Böylece "Hücum Hattı" grubundaki bir TE, yalnızca TE'lere açılan bir programı
-- da görmeye devam eder.
-- =============================================

-- ---------------------------------------------
-- 1) tr_fold — Türkçe duyarlı karşılaştırma folding'i.
--
-- lower() TEK BAŞINA YETMEZ: en_US.UTF-8 altında lower('İ') = 'i' + U+0307
-- (combining dot above), bu yüzden 'Artistik Cimnastik' ile 'ARTİSTİK CİMNASTİK'
-- lower() sonrası EŞLEŞMEZ (canlı veride 3 satırda doğrulandı, 2026-09-22).
-- Aynı fold mantığı TS tarafında packages/validators/athlete.ts TR_CHAR_MAP
-- olarak zaten var — ikisi aynı karakter kümesini kapsar.
--
-- SECURITY INVOKER (varsayılan) ve saf: tabloya hiç erişmez, dolayısıyla §4.1'in
-- "her SECURITY DEFINER fonksiyonu yetki kontrolü içermeli" kuralı KAPSAMAZ.
-- ---------------------------------------------
create or replace function public.tr_fold(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(translate(btrim(p_value), 'İIıÇçĞğÖöŞşÜü', 'iiiccggoossuu'));
$$;

comment on function public.tr_fold(text) is
  'Turkce duyarli karsilastirma folding: I/i/ı/C/G/O/S/U. lower() tek basina I harfini combining dot uretecek sekilde katladigi icin yetersizdir.';

-- ---------------------------------------------
-- 2) matches_training_group — RLS'in 4 politikada tekrarladığı eşleşme kuralı.
-- Saf fonksiyon, SECURITY INVOKER, tabloya erişmez (§4.1 kapsamı dışı).
-- NULL DÖNMEZ — politikalar zaten coalesce(..., false) ile sarılı olsa da
-- fail-closed davranışı burada da garanti altına alınır.
-- ---------------------------------------------
create or replace function public.matches_training_group(
  p_athlete_group    text,
  p_athlete_position text,
  p_program_group    text
)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(
    -- Gruplandırılmamış program: takımın tamamı görür (mevcut davranış).
    p_program_group is null
    or public.tr_fold(p_program_group) = public.tr_fold(p_athlete_group)
    -- Fallback: grubu boş olan sporcu için mevki grup yerine geçer.
    or public.tr_fold(p_program_group) = public.tr_fold(p_athlete_position),
    false
  );
$$;

comment on function public.matches_training_group(text, text, text) is
  'Bir sporcunun (grup, mevki) cifti bir takim programinin training_group daraltmasiyla eslesiyor mu. Program grubu null ise takimin tamami eslesir.';

revoke all on function public.matches_training_group(text, text, text) from anon;
revoke all on function public.tr_fold(text) from anon;

-- ---------------------------------------------
-- 3) BACKFILL — `position` yalnızca takımın branşını tekrar ediyorsa temizle.
-- Mevki alanı artık gerçekten mevki tutacak; branş takımdan türetilecek.
-- Takımın branşından FARKLI bir değer yazılmışsa DOKUNULMAZ (veri kaybı yok).
-- ---------------------------------------------
update athletes a
set position = null
from teams t
where t.id = a.team_id
  and a.position is not null
  and t.discipline is not null
  and public.tr_fold(a.position) = public.tr_fold(t.discipline);

comment on column athletes.position is
  'MEVKI — serbest metin (orn. Tight End, RB, Libero). Brans DEGIL (o teams.discipline icindedir). Gorunurlugu dogrudan daraltmaz; yalnizca training_group bosken matches_training_group fallback olarak kullanilir.';

comment on column athletes.training_group is
  'ANTRENMAN GRUBU — takim ici alt grup (orn. Hucum Hatti, Skill). Bir takim programina grup atanirsa yalnizca eslesen sporcular published programi gorur (bkz. matches_training_group).';

comment on column training_programs.training_group is
  'Bu takim programini yalnizca eslesen antrenman grubuna/mevkiye acar. null = takimin tamami. Yalnizca team_id dolu programlarda kullanilabilir (043_training_groups.sql CHECK).';

-- ---------------------------------------------
-- 4) RLS — 4 politikadaki sporcu-published dalı matches_training_group'a
-- devredildi. Coach/admin dalları AYNEN korundu (canlıda pg_policies ile
-- birebir doğrulandı, 2026-09-22).
-- ---------------------------------------------
alter policy "programs_select" on training_programs using (
  coalesce(
    is_super_admin()
    or my_role(org_id) = 'admin'
    or (
      my_role(org_id) = 'coach'
      and (
        team_id = my_team_id(org_id)
        or exists (
          select 1 from athletes a2
          where a2.id = training_programs.athlete_id
          and a2.team_id = my_team_id(a2.org_id)
        )
      )
    )
    or (
      exists (
        select 1 from athletes a
        where a.user_id = auth.uid()
        and (
          a.id = athlete_id
          or (
            a.team_id = training_programs.team_id
            and matches_training_group(a.training_group, a.position, training_programs.training_group)
          )
        )
      )
      and is_published = true
    ),
    false
  )
);

alter policy "sessions_select" on training_sessions using (
  coalesce(
    exists (
      select 1 from training_programs p
      where p.id = training_sessions.program_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a2
              where a2.id = p.athlete_id
              and a2.team_id = my_team_id(p.org_id)
            )
          )
        )
        or (
          exists (
            select 1 from athletes a
            where a.user_id = auth.uid()
            and (
              a.id = p.athlete_id
              or (
                a.team_id = p.team_id
                and matches_training_group(a.training_group, a.position, p.training_group)
              )
            )
          )
          and p.is_published = true
        )
      )
    ),
    false
  )
);

alter policy "exercises_select" on exercises using (
  coalesce(
    exists (
      select 1 from training_sessions s
      join training_programs p on p.id = s.program_id
      where s.id = exercises.session_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a2
              where a2.id = p.athlete_id
              and a2.team_id = my_team_id(p.org_id)
            )
          )
        )
        or (
          exists (
            select 1 from athletes a
            where a.user_id = auth.uid()
            and (
              a.id = p.athlete_id
              or (
                a.team_id = p.team_id
                and matches_training_group(a.training_group, a.position, p.training_group)
              )
            )
          )
          and p.is_published = true
        )
      )
    ),
    false
  )
);

alter policy "exercise_sets_select" on exercise_sets using (
  coalesce(
    exists (
      select 1 from exercises e
      join training_sessions s on s.id = e.session_id
      join training_programs p on p.id = s.program_id
      where e.id = exercise_sets.exercise_id
      and (
        is_super_admin()
        or my_role(p.org_id) = 'admin'
        or (
          my_role(p.org_id) = 'coach'
          and (
            p.team_id = my_team_id(p.org_id)
            or exists (
              select 1 from athletes a2
              where a2.id = p.athlete_id
              and a2.team_id = my_team_id(p.org_id)
            )
          )
        )
        or (
          exists (
            select 1 from athletes a
            where a.user_id = auth.uid()
            and (
              a.id = p.athlete_id
              or (
                a.team_id = p.team_id
                and matches_training_group(a.training_group, a.position, p.training_group)
              )
            )
          )
          and p.is_published = true
        )
      )
    ),
    false
  )
);
