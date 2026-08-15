-- =============================================
-- 036_athletes_team_id_nullable.sql — Parti 17
--
-- athletes.team_id NOT NULL (001_schema.sql) + "on delete set null" FK
-- çelişkisi: takım silindiğinde Postgres NOT NULL ihlali fırlatıyordu,
-- "sporcu takımsız kalır" hiç çalışmıyordu. Yalnızca kısıtı gevşetiyor —
-- 13 tablolu CASCADE zincirine (athletes'e "dokunmama" notunun asıl amacı)
-- dokunmuyor, zaten deklare edilmiş "on delete set null" davranışını
-- fiilen çalışır hale getiriyor. Kullanıcı onayıyla (Parti 17 planlama,
-- ayrı bir bulgu — bkz. BUGS.md).
-- =============================================

alter table athletes alter column team_id drop not null;
