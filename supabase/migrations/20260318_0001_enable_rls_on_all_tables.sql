-- Enable RLS on tables that were missing it.
-- These tables are only accessed server-side via service_role,
-- so no permissive policies are needed (service_role bypasses RLS).

ALTER TABLE public.institution_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_billing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_setup_links ENABLE ROW LEVEL SECURITY;
