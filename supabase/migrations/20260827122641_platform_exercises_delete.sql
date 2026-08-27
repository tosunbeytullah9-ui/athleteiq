-- =============================================
-- 20260827122641_platform_exercises_delete.sql
-- Süper admin için platform egzersizi KALICI silme.
--
-- ADLANDIRMA: MCP ile doğrudan uygulandığı için sürüm otomatik atandı
-- (bkz. CLAUDE.md §4.1 — 20260818073627 ile aynı durum). schema_migrations
-- kaydıyla eşleşmesi zorunlu olduğundan yeniden adlandırılamaz; bundan
-- sonraki migration'lar sıralı konvansiyona (041...) devam etmelidir.
--
-- 028_platform_exercises_admin_rls.sql "hard delete YOK, is_active toggle var"
-- kararını kaydetmişti. Bu karar platform sahibinin talebiyle geri alınıyor:
-- kütüphane 135 → 1424 egzersize çıktıktan sonra (039 toplu import) pasife
-- almak yetmiyor, kütüphaneden tamamen çıkarma gerekiyor. is_active toggle'ı
-- KALDIRILMADI — geçici gizleme için hâlâ orada, silme kalıcı çıkarma için.
--
-- Silmenin etkisi (şema üzerinden doğrulandı):
--   - exercises (program satırları): egzersiz adını TEXT olarak tutar, FK yok
--     → mevcut programlar BOZULMAZ, kayıtlı isim yerinde kalır.
--   - org_exercises.forked_from_platform: `on delete set null`
--     → fork'lanmış org egzersizi silinmez, yalnızca kaynak bağı kopar.
--   - athlete_1rm_records.exercise_id: FK'sız uuid; exercise_name TEXT yanında
--     durur ve "Son max" rozeti isim üzerinden eşleştiği için 1RM kaydı
--     kullanılabilir kalır, yalnızca exercise_id sarkar.
-- =============================================

create policy "platform_exercises_delete"
  on platform_exercises for delete
  using (is_super_admin());
