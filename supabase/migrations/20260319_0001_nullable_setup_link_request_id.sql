-- Allow setup links to be created without an access request (direct links from admin).
ALTER TABLE public.institution_setup_links ALTER COLUMN request_id DROP NOT NULL;
