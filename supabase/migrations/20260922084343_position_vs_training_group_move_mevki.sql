-- =============================================
-- 20260922084343_position_vs_training_group_move_mevki.sql (2026-09-22)
--
-- 20260922084236'nin devamı. MCP apply_migration her çağrıya kendi zaman
-- damgasını attığı için iki ayrı sürüm olarak kayıtlı (§4.1 deseni).
-- =============================================

-- 3b) BACKFILL — mevki bilgisi gidecek yeri olmadığı için `training_group`'a
-- yazılmıştı (Koç Rams: "TE", "RB", "Linebacker" — hepsi mevki, grup değil).
-- Artık gerçek alanına taşınıyor. GÜVENLİ: canlıda 31/31 programın
-- training_group'u null, yani hiçbir program bu değerlere bağımlı değil
-- (2026-09-22'de doğrulandı). Grup daraltması kullanan bir kurulumda bu adım
-- atlanmalıydı — o yüzden koşul yalnızca "grup dolu ve mevki boş"tur ve
-- matches_training_group fallback'i sayesinde taşıma davranışı korur.
update athletes
set training_group = null,
    position = training_group
where training_group is not null
  and position is null;
