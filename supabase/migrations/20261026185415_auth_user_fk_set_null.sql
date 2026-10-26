-- =============================================
-- auth_user_fk_set_null — auth.users'a referans veren audit kolonları ON DELETE SET NULL
-- =============================================
-- Parti 18B. Bu 15 FK ON DELETE NO ACTION idi (hepsi nullable): wellness/geri bildirim
-- girmiş bir sporcunun veya program yazmış bir koçun auth.admin.deleteUser çağrısı FK
-- ihlaliyle reddediliyordu — canlıda 21 üyelikten 14'ü (adminlerin 3/3'ü, sporcuların
-- 10/16'sı, koçların 1/2'si) delete-org-user ile silinemiyordu.
--
-- Artık kullanıcı silinince yalnızca yazar/işlem yapan damgası NULL olur; satırlar
-- (koçun yazdığı programlar, egzersizler, planlar, yoklamalar) org'da KORUNUR.
-- NULL'a düşmek hiçbir şeyi bozmaz (Faz 1'de doğrulandı): hiçbir kolonda NOT NULL /
-- CHECK yok; wellness_checkins/session_feedback damga politikaları zaten
-- "entered_by IS NULL OR entered_by = auth.uid()" kabul ediyor; created_by = auth.uid()
-- sahiplik dalları NULL'da yalnızca admin'e düşer (beklenen).

alter table public.memberships
  drop constraint memberships_invited_by_fkey,
  add constraint memberships_invited_by_fkey foreign key (invited_by) references auth.users (id) on delete set null;

alter table public.training_programs
  drop constraint training_programs_created_by_fkey,
  add constraint training_programs_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table public.org_exercise_categories
  drop constraint org_exercise_categories_created_by_fkey,
  add constraint org_exercise_categories_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table public.org_exercises
  drop constraint org_exercises_created_by_fkey,
  add constraint org_exercises_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null,
  drop constraint org_exercises_updated_by_fkey,
  add constraint org_exercises_updated_by_fkey foreign key (updated_by) references auth.users (id) on delete set null;

alter table public.wellness_checkins
  drop constraint wellness_checkins_entered_by_fkey,
  add constraint wellness_checkins_entered_by_fkey foreign key (entered_by) references auth.users (id) on delete set null;

alter table public.program_blocks
  drop constraint program_blocks_created_by_fkey,
  add constraint program_blocks_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table public.attendance_records
  drop constraint attendance_records_recorded_by_fkey,
  add constraint attendance_records_recorded_by_fkey foreign key (recorded_by) references auth.users (id) on delete set null;

alter table public.session_feedback
  drop constraint session_feedback_coach_read_by_fkey,
  add constraint session_feedback_coach_read_by_fkey foreign key (coach_read_by) references auth.users (id) on delete set null,
  drop constraint session_feedback_coach_replied_by_fkey,
  add constraint session_feedback_coach_replied_by_fkey foreign key (coach_replied_by) references auth.users (id) on delete set null,
  drop constraint session_feedback_entered_by_fkey,
  add constraint session_feedback_entered_by_fkey foreign key (entered_by) references auth.users (id) on delete set null;

alter table public.annual_plan_methods
  drop constraint annual_plan_methods_created_by_fkey,
  add constraint annual_plan_methods_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table public.annual_plans
  drop constraint annual_plans_created_by_fkey,
  add constraint annual_plans_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

alter table public.drill_diagrams
  drop constraint drill_diagrams_created_by_fkey,
  add constraint drill_diagrams_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null,
  drop constraint drill_diagrams_updated_by_fkey,
  add constraint drill_diagrams_updated_by_fkey foreign key (updated_by) references auth.users (id) on delete set null;
