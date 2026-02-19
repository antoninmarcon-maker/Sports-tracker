
-- Add share_token column for public sharing
ALTER TABLE public.matches ADD COLUMN share_token TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX idx_matches_share_token ON public.matches (share_token) WHERE share_token IS NOT NULL;

-- Allow anyone to read a match if they have the share_token
CREATE POLICY "Anyone can view shared matches"
ON public.matches
FOR SELECT
USING (share_token IS NOT NULL);
