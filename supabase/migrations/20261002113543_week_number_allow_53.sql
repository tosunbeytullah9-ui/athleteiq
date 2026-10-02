-- =============================================
-- 20261002113543_week_number_allow_53.sql
--
-- training_programs.week_number ISO 8601 takvim haftasıdır
-- (to_char(start_date, 'IW')) ve yalnızca bilgi amaçlıdır. Ama check
-- constraint'i 1–52 idi — oysa ISO yılı 53 hafta da olabilir. 2026 böyle bir
-- yıl: 28.12.2026 – 03.01.2027 haftası IW = 53, dolayısıyla o hafta başlayan
-- HİÇBİR program (create_program_with_weeks, update_program_week,
-- copy_program_block) oluşturulamıyordu. Blok kopyalama özelliğinin canlı
-- testinde yılbaşını aşan bir kopya bu yüzden reddedildi (2026-10-02).
-- =============================================

alter table training_programs drop constraint training_programs_week_number_check;

alter table training_programs
  add constraint training_programs_week_number_check
  check (week_number >= 1 and week_number <= 53);
