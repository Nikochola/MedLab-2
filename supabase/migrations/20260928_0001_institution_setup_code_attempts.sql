-- Cap wrong verification-code guesses per issued code on institution setup links.
alter table public.institution_setup_links
  add column if not exists verification_attempts integer not null default 0;
