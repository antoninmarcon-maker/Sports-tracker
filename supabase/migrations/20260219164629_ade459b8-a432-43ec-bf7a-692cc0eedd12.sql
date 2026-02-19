
-- Restrict write policies to authenticated role only

-- MATCHES: existing policies are RESTRICTIVE, recreate as authenticated only
DROP POLICY IF EXISTS "Users can create their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;

CREATE POLICY "Users can view their own matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own matches" ON public.matches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SETS
DROP POLICY IF EXISTS "Users can view their match sets" ON public.sets;
DROP POLICY IF EXISTS "Users can insert sets for their matches" ON public.sets;
DROP POLICY IF EXISTS "Users can update their match sets" ON public.sets;
DROP POLICY IF EXISTS "Users can delete their match sets" ON public.sets;

CREATE POLICY "Users can view their match sets" ON public.sets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can insert sets for their matches" ON public.sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update their match sets" ON public.sets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete their match sets" ON public.sets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = sets.match_id AND matches.user_id = auth.uid()));

-- PLAYERS
DROP POLICY IF EXISTS "Users can view their match players" ON public.players;
DROP POLICY IF EXISTS "Users can insert players for their matches" ON public.players;
DROP POLICY IF EXISTS "Users can update their match players" ON public.players;
DROP POLICY IF EXISTS "Users can delete their match players" ON public.players;

CREATE POLICY "Users can view their match players" ON public.players FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can insert players for their matches" ON public.players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update their match players" ON public.players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete their match players" ON public.players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = players.match_id AND matches.user_id = auth.uid()));

-- POINTS
DROP POLICY IF EXISTS "Users can view their match points" ON public.points;
DROP POLICY IF EXISTS "Users can insert points for their matches" ON public.points;
DROP POLICY IF EXISTS "Users can update their match points" ON public.points;
DROP POLICY IF EXISTS "Users can delete their match points" ON public.points;

CREATE POLICY "Users can view their match points" ON public.points FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can insert points for their matches" ON public.points FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can update their match points" ON public.points FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
CREATE POLICY "Users can delete their match points" ON public.points FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches WHERE matches.id = points.match_id AND matches.user_id = auth.uid()));
