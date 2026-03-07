-- Apply this in Supabase SQL Editor for public.reservations
-- to allow the frontend (publishable/anon key) to read and write rows.

alter table public.reservations enable row level security;

drop policy if exists "anon_select_reservations" on public.reservations;
drop policy if exists "anon_insert_reservations" on public.reservations;
drop policy if exists "anon_update_reservations" on public.reservations;
drop policy if exists "anon_delete_reservations" on public.reservations;

create policy "anon_select_reservations"
on public.reservations
for select
to anon
using (true);

create policy "anon_insert_reservations"
on public.reservations
for insert
to anon
with check (true);

create policy "anon_update_reservations"
on public.reservations
for update
to anon
using (true)
with check (true);

create policy "anon_delete_reservations"
on public.reservations
for delete
to anon
using (true);
