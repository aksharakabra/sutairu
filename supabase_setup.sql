-- Sutairu: run this once in Supabase, SQL Editor, New query, then Run.
create table public.closets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);
create table public.holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  closet_id uuid not null references public.closets(id) on delete cascade,
  look_id text not null,
  created_at timestamptz not null default now(),
  unique (closet_id, look_id)
);
alter table public.closets enable row level security;
alter table public.holds enable row level security;
-- Each member can only see and change their own rows.
create policy "own closets" on public.closets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own holds" on public.holds for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.closets c where c.id = closet_id and c.user_id = auth.uid()));
