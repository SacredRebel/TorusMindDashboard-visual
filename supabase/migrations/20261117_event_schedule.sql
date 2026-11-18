-- Optional calendar scheduling expansion. Apply in the approved Torus Supabase project.
-- Retains current events, RLS and partners venue_id relationships.
-- This does not enable Google Calendar or Google Sheets sync.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS details text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.events.details IS 'Business event logistics only; no patient data.';
