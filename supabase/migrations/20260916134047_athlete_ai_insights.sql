-- Parti 21-AI — süper admin'e özel wearable AI analiz asistanı.
-- Yalnızca service-role (athlete-ai-insight Edge Function) yazar — anon/authenticated
-- için INSERT/UPDATE/DELETE yetkisi yok, SELECT yalnızca is_super_admin() true ise.
-- readiness_scores'a DOKUNULMADI — o tablo READINESS_PLAN.md'deki ayrı algoritmaya ait.

create table public.athlete_ai_insights (
  id                uuid primary key default gen_random_uuid(),
  athlete_id        uuid not null references public.athletes(id) on delete cascade,
  insight_date      date not null,
  status            text not null check (status in ('ok','insufficient_data','error')),
  confidence        text check (confidence in ('dusuk','orta','yuksek')),
  output            jsonb,
  features          jsonb not null,
  payload_sent      jsonb,
  provider_base_url text,
  model             text,
  prompt_version    text not null,
  algorithm_version text not null,
  tokens_in         integer,
  tokens_out        integer,
  latency_ms        integer,
  error_code        text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index athlete_ai_insights_athlete_date_idx
  on public.athlete_ai_insights (athlete_id, insight_date desc, created_at desc);

alter table public.athlete_ai_insights enable row level security;

create policy athlete_ai_insights_select_super_admin
  on public.athlete_ai_insights
  for select to authenticated
  using (coalesce(public.is_super_admin(), false));

revoke all on public.athlete_ai_insights from anon;
revoke insert, update, delete on public.athlete_ai_insights from authenticated;
