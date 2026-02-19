
-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view shared matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can view their own matches"
  ON public.matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared matches"
  ON public.matches FOR SELECT
  USING (share_token IS NOT NULL);

CREATE POLICY "Users can create their own matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own matches"
  ON public.matches FOR DELETE
  USING (auth.uid() = user_id);
