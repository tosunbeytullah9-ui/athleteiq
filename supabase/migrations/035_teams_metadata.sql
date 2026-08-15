-- =============================================
-- 035_teams_metadata.sql — Parti 17
--
-- teams tablosuna updated_at + trigger ekler, org bazında takım adı
-- benzersizliğini zorunlu kılar.
-- =============================================

alter table teams add column updated_at timestamptz not null default now();

create trigger teams_updated_at before update on teams
  for each row execute function update_updated_at();

-- Not: uygulanmadan önce mükerrer isim kontrolü yapıldı — bkz. Görev 2
-- doğrulaması (planlama sırasında görülen 5 takım hepsi kendi org'unda
-- benzersizdi: tgf/ACE, tgf/ACK, tgf/Ritmik Takım, tgf/Trampolin Takım,
-- koc-universitesi/Koç Rams).
create unique index idx_teams_org_name on teams (org_id, lower(name));
