-- =============================================
-- 028_platform_exercises_admin_rls.sql
-- Super-admin platform egzersiz kütüphanesi yönetimi:
-- platform_exercises için is_super_admin() ile gate'li
-- INSERT/UPDATE politikaları. platform_read_all (SELECT)
-- politikasına dokunulmadı. DELETE politikası bilinçli
-- olarak eklenmedi — hard delete YOK, is_active toggle var.
-- =============================================

create policy "platform_exercises_insert"
  on platform_exercises for insert
  with check (is_super_admin());

create policy "platform_exercises_update"
  on platform_exercises for update
  using (is_super_admin());
