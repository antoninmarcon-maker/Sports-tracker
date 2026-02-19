import { supabase } from '@/integrations/supabase/client';
import { MatchSummary } from '@/types/volleyball';
import { getAllMatches as getLocalMatches, saveMatch as saveLocalMatch, deleteMatch as deleteLocalMatch } from './matchStorage';

// Sync local matches to cloud on first login
export async function syncLocalMatchesToCloud(userId: string) {
  const localMatches = getLocalMatches();
  if (localMatches.length === 0) return;

  for (const match of localMatches) {
    // Check if already exists in cloud
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('id', match.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('matches').insert({
        id: match.id,
        user_id: userId,
        match_data: match as any,
        finished: match.finished,
        sport: match.sport || 'volleyball',
      });
    }
  }

  // Clear local storage after sync
  localStorage.removeItem('volley-tracker-matches');
}

// Get all matches from cloud
export async function getCloudMatches(): Promise<MatchSummary[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];
  return data.map(row => row.match_data as unknown as MatchSummary);
}

// Save match to cloud
export async function saveCloudMatch(userId: string, match: MatchSummary) {
  const { error } = await supabase
    .from('matches')
    .upsert({
      id: match.id,
      user_id: userId,
      match_data: match as any,
      finished: match.finished,
      sport: match.sport || 'volleyball',
      updated_at: new Date().toISOString(),
    });

  if (error) console.error('Cloud save error:', error);
}

// Delete match from cloud
export async function deleteCloudMatch(matchId: string) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);

  if (error) console.error('Cloud delete error:', error);
}
