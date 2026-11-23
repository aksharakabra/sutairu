-- Sutairu, Cluster 6. If you ALREADY ran supabase_setup.sql, run only this file (SQL Editor, New query, Run).
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.outfits enable row level security;
create policy "own outfits" on public.outfits for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
