-- =============================================
-- 033_drop_memberships_insert_self.sql — Parti 16
--
-- "memberships_insert_self" (008_rls_signup.sql, 024_revert_signup_self_serve_rls.sql'de
-- daraltıldı) artık gereksiz VE `memberships_insert`'ten (002_rls.sql:
-- is_super_admin() or my_role(org_id)='admin') DAHA GENİŞ bir ikinci
-- politika: coach dalı (`my_role(org_id) in ('admin','coach')`) herhangi bir
-- coach'un KENDİ ORG'UNDA bir membership INSERT edebilmesine (örn. kendine
-- admin rolü vermesine) izin veriyordu. Hiçbir canlı akış bu dalı
-- kullanmıyor (coach hiçbir çalışan UI akışında membership oluşturmuyor) —
-- create-org-user Edge Function service-role ile yazdığı için zaten RLS'e
-- tabi değil, bu DROP yeni akışı etkilemiyor. Kapatılan boşluk: "coach
-- kendine/başkasına admin rolü verebilir".
-- =============================================

drop policy if exists "memberships_insert_self" on memberships;
