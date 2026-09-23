-- CoreStay PMS - Room Status Access
-- Housekeeping updates pms_rooms directly.

alter table public.pms_rooms enable row level security;

drop policy if exists "CoreStay PMS rooms select" on public.pms_rooms;
drop policy if exists "CoreStay PMS rooms update" on public.pms_rooms;

create policy "CoreStay PMS rooms select"
on public.pms_rooms
for select
to anon, authenticated
using (true);

create policy "CoreStay PMS rooms update"
on public.pms_rooms
for update
to anon, authenticated
using (true)
with check (true);

grant select, update on public.pms_rooms to anon, authenticated;
