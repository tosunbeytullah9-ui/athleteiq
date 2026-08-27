-- =============================================
-- 038_exercise_taxonomy_extend.sql
-- Egzersiz kütüphanesi importu öncesi hazırlık:
--   1. movement_pattern taksonomisine 'isolation' + 'olympic_lift' eklenir
--   2. platform_exercises.name_tr tamamen boşaltılır (Türkçe isim kullanılmayacak)
--   3. platform_exercises(lower(name)) unique index — 039'un ON CONFLICT hedefi
-- =============================================

-- ---------------------------------------------
-- 1. Taksonomi genişletme
-- ---------------------------------------------
-- Mevcut 16 hareket kalıbı S&C hareket-kalıbı temelliydi; içe aktarılan veri seti
-- bodybuilding izolasyon hareketlerini (412 kayıt) ve olimpik halter türevlerini
-- (27 kayıt) de kapsıyor. Bu ikisinin mevcut 16 değerde dürüst bir karşılığı yok.

alter table platform_exercises
  drop constraint if exists platform_exercises_movement_pattern_check;

alter table platform_exercises
  add constraint platform_exercises_movement_pattern_check
  check (movement_pattern in (
    'horizontal_push','vertical_push',
    'horizontal_pull','vertical_pull',
    'hip_hinge_bilateral','hip_hinge_unilateral',
    'knee_dominant_bilateral','knee_dominant_unilateral',
    'rotation','anti_rotation',
    'jump_land','locomotion',
    'core_stability','loaded_carry',
    'sport_specific','mobility_flexibility',
    'isolation','olympic_lift'
  ));

-- org_exercises.movement_pattern nullable'dır (custom_category_id alternatifi var);
-- IN listesi NULL'ı zaten geçirir, orijinal formu korunur.
alter table org_exercises
  drop constraint if exists org_exercises_movement_pattern_check;

alter table org_exercises
  add constraint org_exercises_movement_pattern_check
  check (movement_pattern in (
    'horizontal_push','vertical_push',
    'horizontal_pull','vertical_pull',
    'hip_hinge_bilateral','hip_hinge_unilateral',
    'knee_dominant_bilateral','knee_dominant_unilateral',
    'rotation','anti_rotation',
    'jump_land','locomotion',
    'core_stability','loaded_carry',
    'sport_specific','mobility_flexibility',
    'isolation','olympic_lift'
  ));

-- ---------------------------------------------
-- 2. Türkçe isimleri kaldır
-- ---------------------------------------------
-- Kütüphane tek dilli (İngilizce) yürütülecek. UI zaten `name_tr ?? name`
-- fallback'i yapıyor (exercise-picker-modal.tsx), kolon düşürülmez —
-- yalnızca içerik boşaltılır.
-- GERİ ALMA: silinen 135 Türkçe ismin tamamı 006_exercise_seed.sql içinde
-- commit'li duruyor; gerekirse oradan yeniden yazılabilir.
update platform_exercises set name_tr = null where name_tr is not null;

-- org_exercises'e DOKUNULMAZ: orası koçların kendi girdiği org verisi.

-- ---------------------------------------------
-- 3. İsim tekilliği
-- ---------------------------------------------
-- 039'daki toplu insert'in `on conflict ((lower(name))) do nothing` hedefi.
-- Mevcut 135 seed kaydında isim tekrarı yok (doğrulandı), index sorunsuz kurulur.
create unique index if not exists platform_exercises_name_lower_key
  on platform_exercises (lower(name));
