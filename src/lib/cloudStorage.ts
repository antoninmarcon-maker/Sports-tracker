import { supabase } from '@/integrations/supabase/client';
import { MatchSummary, SetData, Point, Player } from '@/types/sports';
import { getAllMatches as getLocalMatches, saveMatch as saveLocalMatch, deleteMatch as deleteLocalMatch } from './matchStorage';

// Helper: check if user has an active session
async function hasSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Reconstruct a MatchSummary from normalized DB rows
function reconstructMatch(
  matchRow: any,
  setsRows: any[],
  pointsRows: any[],
  playersRows: any[]
): MatchSummary {
  const matchPlayers: Player[] = playersRows.map(p => ({
    id: p.id,
    number: p.number || '',
    name: p.name || '',
  }));

  const completedSets: SetData[] = setsRows
    .sort((a, b) => a.number - b.number)
    .map(s => ({
      id: s.id,
      number: s.number,
      points: pointsRows
        .filter(p => p.set_id === s.id)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(mapPointRow),
      score: { blue: s.score_blue, red: s.score_red },
      winner: s.winner,
      duration: s.duration,
    }));

  const currentPoints: Point[] = pointsRows
    .filter(p => !p.set_id)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(mapPointRow);

  return {
    id: matchRow.id,
    teamNames: { blue: matchRow.team_name_blue, red: matchRow.team_name_red },
    completedSets,
    currentSetNumber: matchRow.current_set_number,
    points: currentPoints,
    sidesSwapped: matchRow.sides_swapped,
    chronoSeconds: matchRow.chrono_seconds,
    createdAt: new Date(matchRow.created_at).getTime(),
    updatedAt: new Date(matchRow.updated_at).getTime(),
    finished: matchRow.finished,
    players: matchPlayers,
    sport: matchRow.sport || 'volleyball',
  };
}

function mapPointRow(p: any): Point {
  return {
    id: p.id,
    team: p.team,
    type: p.type,
    action: p.action,
    x: p.x,
    y: p.y,
    timestamp: Number(p.timestamp),
    playerId: p.player_id || undefined,
    pointValue: p.point_value ?? undefined,
  };
}

// Sync local matches to cloud on first login
export async function syncLocalMatchesToCloud(userId: string) {
  const localMatches = getLocalMatches();
  if (localMatches.length === 0) return;

  for (const match of localMatches) {
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('id', match.id)
      .maybeSingle();

    if (!existing) {
      await saveCloudMatch(userId, match);
    }
  }
}

// Get all matches from cloud
export async function getCloudMatches(): Promise<MatchSummary[]> {
  if (!(await hasSession())) return [];

  const { data: matchRows, error } = await supabase
    .from('matches')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !matchRows || matchRows.length === 0) return [];

  const matchIds = matchRows.map(m => m.id);

  // Fetch related data in parallel
  const [setsRes, pointsRes, playersRes] = await Promise.all([
    supabase.from('sets').select('*').in('match_id', matchIds),
    supabase.from('points').select('*').in('match_id', matchIds),
    supabase.from('players').select('*').in('match_id', matchIds),
  ]);

  const allSets = setsRes.data || [];
  const allPoints = pointsRes.data || [];
  const allPlayers = playersRes.data || [];

  return matchRows.map(m => reconstructMatch(
    m,
    allSets.filter(s => s.match_id === m.id),
    allPoints.filter(p => p.match_id === m.id),
    allPlayers.filter(p => p.match_id === m.id),
  ));
}

// Save match to cloud using normalized tables
export async function saveCloudMatch(userId: string, match: MatchSummary) {
  if (!(await hasSession())) return;

  // 1. Upsert the match row
  const { error: matchError } = await supabase.from('matches').upsert({
    id: match.id,
    user_id: userId,
    match_data: match as any, // keep for backward compat
    finished: match.finished,
    sport: match.sport || 'volleyball',
    team_name_blue: match.teamNames.blue,
    team_name_red: match.teamNames.red,
    current_set_number: match.currentSetNumber,
    sides_swapped: match.sidesSwapped,
    chrono_seconds: match.chronoSeconds,
    updated_at: new Date().toISOString(),
  });

  if (matchError) {
    console.error('Cloud match save error:', matchError);
    return;
  }

  // 2. Delete existing related data and re-insert (simplest approach for full sync)
  await Promise.all([
    supabase.from('points').delete().eq('match_id', match.id),
    supabase.from('sets').delete().eq('match_id', match.id),
    supabase.from('players').delete().eq('match_id', match.id),
  ]);

  // 3. Insert players
  if (match.players && match.players.length > 0) {
    const playerRows = match.players.map(p => ({
      id: p.id,
      match_id: match.id,
      number: p.number,
      name: p.name,
    }));
    await supabase.from('players').insert(playerRows);
  }

  // 4. Insert completed sets and their points
  for (const set of match.completedSets) {
    const { error: setError } = await supabase.from('sets').insert({
      id: set.id,
      match_id: match.id,
      number: set.number,
      score_blue: set.score.blue,
      score_red: set.score.red,
      winner: set.winner,
      duration: set.duration,
    });

    if (!setError && set.points.length > 0) {
      const pointRows = set.points.map(p => ({
        match_id: match.id,
        set_id: set.id,
        team: p.team,
        type: p.type,
        action: p.action,
        x: p.x,
        y: p.y,
        timestamp: p.timestamp,
        player_id: p.playerId || null,
        point_value: p.pointValue ?? null,
      }));
      await supabase.from('points').insert(pointRows);
    }
  }

  // 5. Insert current (in-progress) points
  if (match.points.length > 0) {
    const currentPointRows = match.points.map(p => ({
      match_id: match.id,
      set_id: null,
      team: p.team,
      type: p.type,
      action: p.action,
      x: p.x,
      y: p.y,
      timestamp: p.timestamp,
      player_id: p.playerId || null,
      point_value: p.pointValue ?? null,
    }));
    await supabase.from('points').insert(currentPointRows);
  }
}

// Delete match from cloud
export async function deleteCloudMatch(matchId: string) {
  if (!(await hasSession())) return;
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) console.error('Cloud delete error:', error);
}

// Generate or retrieve a share token for a match
export async function generateShareToken(matchId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('matches')
    .select('share_token')
    .eq('id', matchId)
    .maybeSingle();

  if (existing?.share_token) return existing.share_token;

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const { error } = await supabase
    .from('matches')
    .update({ share_token: token } as any)
    .eq('id', matchId);

  if (error) {
    console.error('Share token error:', error);
    return null;
  }
  return token;
}

// Get match data by share token (public, no auth needed)
export async function getMatchByShareToken(token: string): Promise<MatchSummary | null> {
  const { data: matchRow, error } = await supabase
    .from('matches')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();

  if (error || !matchRow) return null;

  const [setsRes, pointsRes, playersRes] = await Promise.all([
    supabase.from('sets').select('*').eq('match_id', matchRow.id),
    supabase.from('points').select('*').eq('match_id', matchRow.id),
    supabase.from('players').select('*').eq('match_id', matchRow.id),
  ]);

  return reconstructMatch(
    matchRow,
    setsRes.data || [],
    pointsRes.data || [],
    playersRes.data || [],
  );
}

// Fetch a single match from cloud by ID and reconstruct it
export async function getCloudMatchById(matchId: string): Promise<MatchSummary | null> {
  if (!(await hasSession())) return null;

  const { data: matchRow } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!matchRow) return null;

  const [setsRes, pointsRes, playersRes] = await Promise.all([
    supabase.from('sets').select('*').eq('match_id', matchId),
    supabase.from('points').select('*').eq('match_id', matchId),
    supabase.from('players').select('*').eq('match_id', matchId),
  ]);

  return reconstructMatch(
    matchRow,
    setsRes.data || [],
    pointsRes.data || [],
    playersRes.data || [],
  );
}
