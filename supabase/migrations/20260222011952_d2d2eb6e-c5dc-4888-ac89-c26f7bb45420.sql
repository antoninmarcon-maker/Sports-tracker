-- Fix UPDATE policy: drop existing and recreate with proper restrictions
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING ((auth.uid() = user_id) OR ((user_id IS NULL) AND (auth.uid() IS NOT NULL)));