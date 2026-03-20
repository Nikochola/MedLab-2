-- Add avatar customization columns to profiles
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_config jsonb;
