-- =============================================
-- session_feedback_function_hardening — Parti 22-FB güvenlik düzeltmesi
--
-- 20260917072700_session_feedback.sql uygulandıktan sonra Supabase security
-- advisor'ının bulduğu iki uyarıyı kapatır:
--
-- 1) function_search_path_mutable — üç trigger fonksiyonunda `set search_path`
--    eksikti. Üçü de SECURITY INVOKER (bu BİLİNÇLİ: set_session_feedback_date
--    RLS altında çalışmalı ki sporcu yalnızca görebildiği bir seansın tarihini
--    çözebilsin) ama sabit search_path yine de gerekli.
-- 2) anon/authenticated_security_definer_function_executable —
--    session_feedback_sync_acwr() SECURITY DEFINER bir TRIGGER fonksiyonu;
--    yalnızca trigger'dan çalışmalı, PostgREST üzerinden çağrılabilir olmamalı.
--    (recalc_acwr_day / refresh_acwr_rolling_loads / can_manage_athlete_feedback
--    ana migration'da zaten revoke edilmişti — bu atlanmıştı.)
-- =============================================

alter function set_session_feedback_date() set search_path = public;
alter function session_feedback_guard_coach_columns() set search_path = public;
alter function session_feedback_clear_coach_columns() set search_path = public;

revoke all on function session_feedback_sync_acwr() from public, anon, authenticated;
