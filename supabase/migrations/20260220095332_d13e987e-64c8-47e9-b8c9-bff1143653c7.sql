
-- Add metadata JSONB column for sport-specific match parameters
-- (format: sets to win, advantage rule, etc.)
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update sport column to accept tennis and padel values
-- The column is already text type, so no enum migration needed
-- We just need to ensure the app accepts the new values
