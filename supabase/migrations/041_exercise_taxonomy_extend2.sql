-- =============================================
-- 041_exercise_taxonomy_extend2.sql
-- 038_exercise_taxonomy_extend.sql'in devamı: movement_pattern taksonomisine
-- 'total_body', 'cardio', 'neck' eklenir (2026-09-05, PROGRESS.md Öncelik 2).
--
-- 038'deki desenle birebir aynı: drop + re-add CHECK constraint, hem
-- platform_exercises hem org_exercises için (org_exercises.movement_pattern
-- nullable, IN listesi NULL'ı zaten geçirir).
-- =============================================

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
    'isolation','olympic_lift',
    'total_body','cardio','neck'
  ));

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
    'isolation','olympic_lift',
    'total_body','cardio','neck'
  ));
