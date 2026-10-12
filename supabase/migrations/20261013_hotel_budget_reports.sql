create table if not exists public.hotel_budget_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_name text not null,
  period_label text not null,
  form_data jsonb not null,
  calculated_data jsonb not null,
  validation_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.hotel_budget_reports enable row level security;

drop policy if exists "Users can read own hotel budget reports" on public.hotel_budget_reports;
create policy "Users can read own hotel budget reports"
  on public.hotel_budget_reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own hotel budget reports" on public.hotel_budget_reports;
create policy "Users can insert own hotel budget reports"
  on public.hotel_budget_reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own hotel budget reports" on public.hotel_budget_reports;
create policy "Users can delete own hotel budget reports"
  on public.hotel_budget_reports for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists hotel_budget_reports_user_created_idx
  on public.hotel_budget_reports (user_id, created_at desc);
