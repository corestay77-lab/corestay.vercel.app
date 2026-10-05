create table if not exists public.assessment_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_type text not null default 'financial',
  file_name text not null,
  score integer,
  report_json jsonb not null,
  pdf_base64 text not null,
  created_at timestamptz not null default now()
);

alter table public.assessment_reports enable row level security;

drop policy if exists "Users can view own assessment reports" on public.assessment_reports;
create policy "Users can view own assessment reports"
on public.assessment_reports for select
to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own assessment reports" on public.assessment_reports;
create policy "Users can insert own assessment reports"
on public.assessment_reports for insert
to authenticated with check (auth.uid() = user_id);

create index if not exists assessment_reports_user_id_created_at_idx
on public.assessment_reports(user_id, created_at desc);

drop policy if exists "Users can delete own assessment reports" on public.assessment_reports;
create policy "Users can delete own assessment reports"
on public.assessment_reports for delete
to authenticated using (auth.uid() = user_id);
