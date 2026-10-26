-- =============================================
-- account_deletion_requests.notified_at — yeni talep bildirimi (Parti 18B-ek)
-- =============================================
-- notify-account-deletion Edge Function'ı talep oluşturulduktan sonra platform sahibine
-- (süper admin) e-posta gönderir ve başarılıysa bu kolonu doldurur. Dolu kolon ikinci
-- çağrıyı no-op yapar (idempotent). Yalnızca service role yazar — authenticated'ın UPDATE
-- yetkisi 20261026185610_account_deletion_requests.sql'de zaten kaldırıldı.

alter table public.account_deletion_requests
  add column notified_at timestamptz;

comment on column public.account_deletion_requests.notified_at is
  'Yeni talep e-postasının platform sahibine gönderildiği an (notify-account-deletion); NULL = henüz bildirilmedi veya gönderim yapılandırılmamış/başarısız.';
