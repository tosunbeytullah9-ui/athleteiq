# Loadwell — Monorepo Klasör Yapısı (CLAUDE.md §2)

> CLAUDE.md'den Parti 18J'de (2026-11-13) **birebir** taşındı — metin ve § numaraları değişmedi.
> Diğer bölümlerin yeri için CLAUDE.md'deki "Başvuru dokümanları" haritasına bakın: [CLAUDE.md](../../CLAUDE.md).
> Kapsam: §2 MONOREPO KLASÖR YAPISI.
> `AUTO-GENERATED:TREE` bloğu `pnpm docs:sync` ile üretilir — elle düzenlemeyin.

---

## 2. MONOREPO KLASÖR YAPISI

<!-- AUTO-GENERATED:TREE:START -->
```
AthleteIQ/
├── .claude/
│   ├── scheduled_tasks.lock
│   └── settings.local.json
├── apps/
│   ├── mobile/
│   │   ├── android/
│   │   ├── app/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── .npmrc
│   │   ├── app.json
│   │   ├── babel.config.js
│   │   ├── bugreport-sdk_gphone64_x86_64-BE4B.251210.005-2026-08-25-14-18-20.zip
│   │   ├── bundle_test.json
│   │   ├── eas.json
│   │   ├── emulator.log
│   │   ├── emulator2.log
│   │   ├── eslint.config.js
│   │   ├── expo-env.d.ts
│   │   ├── global.css
│   │   ├── index.js
│   │   ├── metro.config.js
│   │   ├── metro.log
│   │   ├── metro2.log
│   │   ├── metro3.log
│   │   ├── nativewind-env.d.ts
│   │   ├── package.json
│   │   ├── run-android.log
│   │   ├── run-android2.log
│   │   ├── run-android3.log
│   │   ├── run-android4.log
│   │   ├── studio.log
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── public/
│       ├── .env.local
│       ├── .env.local.testcheck
│       ├── eslint.config.mjs
│       ├── middleware.ts
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       ├── tsconfig.json
│       └── tsconfig.tsbuildinfo
├── docs/
│   ├── app-store/
│   │   ├── eas-build-runbook.md
│   │   ├── review-notes.md
│   │   └── submission-checklist.md
│   └── claude/
│       ├── agents.md
│       ├── database.md
│       ├── env-and-commands.md
│       ├── status.md
│       ├── structure.md
│       └── wearables.md
├── packages/
│   ├── db/
│   │   ├── queries/
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── types.ts
│   ├── integrations/
│   │   ├── fitbit/
│   │   ├── polar/
│   │   ├── whoop/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── validators/
│       ├── account-deletion.test.ts
│       ├── account-deletion.ts
│       ├── acwr.ts
│       ├── annual-plan.test.ts
│       ├── annual-plan.ts
│       ├── athlete-import.test.ts
│       ├── athlete-import.ts
│       ├── athlete.test.ts
│       ├── athlete.ts
│       ├── attendance.ts
│       ├── auth.test.ts
│       ├── auth.ts
│       ├── brand.test.ts
│       ├── brand.ts
│       ├── competition.test.ts
│       ├── competition.ts
│       ├── csv.test.ts
│       ├── csv.ts
│       ├── date.test.ts
│       ├── date.ts
│       ├── demo-request.test.ts
│       ├── demo-request.ts
│       ├── drill.test.ts
│       ├── drill.ts
│       ├── endurance.test.ts
│       ├── endurance.ts
│       ├── exercise.test.ts
│       ├── exercise.ts
│       ├── greeting.test.ts
│       ├── greeting.ts
│       ├── index.ts
│       ├── one-rm-import.test.ts
│       ├── one-rm-import.ts
│       ├── org-user.ts
│       ├── organization.test.ts
│       ├── organization.ts
│       ├── package.json
│       ├── program-copy.test.ts
│       ├── program-copy.ts
│       ├── program-import.test.ts
│       ├── program-import.ts
│       ├── program.ts
│       ├── session-feedback.test.ts
│       ├── session-feedback.ts
│       ├── team.ts
│       ├── tsconfig.json
│       └── wellness.ts
├── patches/
│   └── react-native-css-interop@0.2.6.patch
├── scripts/
│   ├── brand/
│   │   └── render-icons.mjs
│   ├── landing/
│   │   ├── lib/
│   │   ├── backgrounds.json
│   │   ├── capture.mjs
│   │   ├── demo-seed.mjs
│   │   ├── fetch-backgrounds.mjs
│   │   └── record-replicas.mjs
│   ├── security/
│   │   ├── check-metadata-escalation.mjs
│   │   └── rls-visibility-snapshot.mjs
│   ├── docs-sync.mjs
│   ├── import-exercise-library.mjs
│   └── table-descriptions.json
├── supabase/
│   ├── .temp/
│   │   ├── cli-latest
│   │   ├── gotrue-version
│   │   ├── linked-project.json
│   │   ├── pooler-url
│   │   ├── postgres-version
│   │   ├── project-ref
│   │   ├── rest-version
│   │   └── storage-version
│   ├── functions/
│   │   ├── athlete-ai-insight/
│   │   ├── create-athlete-account/
│   │   ├── create-org-user/
│   │   ├── delete-org-user/
│   │   ├── grant-athlete-access/
│   │   ├── invite-member/
│   │   ├── notify-account-deletion/
│   │   ├── process-account-deletion/
│   │   ├── reset-athlete-password/
│   │   ├── reset-user-password/
│   │   ├── update-org-user/
│   │   └── whoop-webhook/
│   ├── migrations/
│   │   ├── 001_schema.sql
│   │   ├── 002_rls.sql
│   │   ├── 003_functions.sql
│   │   ├── 004_wearables.sql
│   │   ├── 005_exercises.sql
│   │   ├── 006_exercise_seed.sql
│   │   ├── 008_rls_signup.sql
│   │   ├── 009_security_fixes.sql
│   │   ├── 010_trial.sql
│   │   ├── 011_realtime.sql
│   │   ├── 012_wellness.sql
│   │   ├── 013_readiness_scores.sql
│   │   ├── 014_exercise_sets.sql
│   │   ├── 015_exercise_sets_fixes.sql
│   │   ├── 016_session_rpe.sql
│   │   ├── 017_program_blocks.sql
│   │   ├── 018_create_program_with_weeks.sql
│   │   ├── 019_shared_session_tree_insert.sql
│   │   ├── 020_update_program_week.sql
│   │   ├── 021_propagate_week.sql
│   │   ├── 022_add_athlete_username.sql
│   │   ├── 023_drop_trial_system.sql
│   │   ├── 024_revert_signup_self_serve_rls.sql
│   │   ├── 025_team_scoped_training_rls.sql
│   │   ├── 026_team_scoped_program_rpc.sql
│   │   ├── 027_drop_calculate_acwr.sql
│   │   ├── 028_platform_exercises_admin_rls.sql
│   │   ├── 029_program_archive.sql
│   │   ├── 030_program_discipline.sql
│   │   ├── 031_1rm_team_scoped_rls.sql
│   │   ├── 032_profiles.sql
│   │   ├── 033_drop_memberships_insert_self.sql
│   │   ├── 034_teams_rls_fix.sql
│   │   ├── 035_teams_metadata.sql
│   │   ├── 036_athletes_team_id_nullable.sql
│   │   ├── 037_organizations_update_policy.sql
│   │   ├── 038_exercise_taxonomy_extend.sql
│   │   ├── 039_exercise_library_import.sql
│   │   ├── 041_exercise_taxonomy_extend2.sql
│   │   ├── 042_attendance.sql
│   │   ├── 043_training_groups.sql
│   │   ├── 20260818073627_parti_18s_secure_definer_functions.sql
│   │   ├── 20260827122641_platform_exercises_delete.sql
│   │   ├── 20260904124844_acwr_logs_update_policy.sql
│   │   ├── 20260909070021_athlete_delete_and_competition_entries.sql
│   │   ├── 20260912072715_wod_sessions.sql
│   │   ├── 20260913123732_whoop_workouts.sql
│   │   ├── 20260913131022_polar_exercises.sql
│   │   ├── 20260913201909_fitbit_activities.sql
│   │   ├── 20260914075144_exercise_1rm_ratios.sql
│   │   ├── 20260916084250_super_admin_app_metadata.sql
│   │   ├── 20260916134047_athlete_ai_insights.sql
│   │   ├── 20260917072700_session_feedback.sql
│   │   ├── 20260917074747_session_feedback_function_hardening.sql
│   │   ├── 20260921081206_annual_plans.sql
│   │   ├── 20260922084236_position_vs_training_group.sql
│   │   ├── 20260922084343_position_vs_training_group_move_mevki.sql
│   │   ├── 20261002113316_endurance_sessions_and_block_copy.sql
│   │   ├── 20261002113426_endurance_recovery_target.sql
│   │   ├── 20261002113543_week_number_allow_53.sql
│   │   ├── 20261005122102_drill_diagrams.sql
│   │   ├── 20261023115038_exercise_1rm_ratios_isportsi.sql
│   │   ├── 20261023144302_demo_requests.sql
│   │   ├── 20261023152441_org_slug_lock.sql
│   │   ├── 20261024082932_competition_stages.sql
│   │   ├── 20261026185415_auth_user_fk_set_null.sql
│   │   ├── 20261026185610_account_deletion_requests.sql
│   │   ├── 20261026201410_function_default_privileges_hardening.sql
│   │   ├── 20261026201424_account_deletion_requests_notified_at.sql
│   │   ├── 20261027091923_program_tree_rls_performance.sql
│   │   ├── 20261027110705_istanbul_calendar_defaults.sql
│   │   └── 20261028113032_athlete_scoped_reads_and_competition_visibility.sql
│   ├── snippets/
│   ├── config.toml
│   └── seed.sql
├── .env
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc
├── AGENTS.md
├── BUGS.md
├── CLAUDE.md
├── MOBILE_STATUS.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── PROGRESS.md
├── READINESS_PLAN.md
├── tsconfig.base.json
├── turbo.json
└── vercel.json
```
<!-- AUTO-GENERATED:TREE:END -->

> Not: `packages/ui` yalnızca `apps/web` tarafından kullanılır (Radix UI tabanlı bileşenler, React Native ile uyumsuz — `apps/mobile`'da hiçbir referans yok). Mobile kendi bileşenlerini (`apps/mobile/components/`) kullanır.

---

