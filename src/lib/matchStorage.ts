import { MatchSummary } from '@/types/volleyball';

const MATCHES_KEY = 'volley-tracker-matches';
const ACTIVE_MATCH_KEY = 'volley-tracker-active-match-id';

export function getAllMatches(): MatchSummary[] {
  try {
    const raw = localStorage.getItem(MATCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function getMatch(id: string): MatchSummary | null {
  return getAllMatches().find(m => m.id === id) ?? null;
}

export function saveMatch(match: MatchSummary) {
  const matches = getAllMatches();
  const idx = matches.findIndex(m => m.id === match.id);
  if (idx >= 0) {
    matches[idx] = { ...match, updatedAt: Date.now() };
  } else {
    matches.push(match);
  }
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

export function deleteMatch(id: string) {
  const matches = getAllMatches().filter(m => m.id !== id);
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  if (getActiveMatchId() === id) clearActiveMatchId();
}

export function getActiveMatchId(): string | null {
  return localStorage.getItem(ACTIVE_MATCH_KEY);
}

export function setActiveMatchId(id: string) {
  localStorage.setItem(ACTIVE_MATCH_KEY, id);
}

export function clearActiveMatchId() {
  localStorage.removeItem(ACTIVE_MATCH_KEY);
}

export function createNewMatch(teamNames: { blue: string; red: string }): MatchSummary {
  return {
    id: crypto.randomUUID(),
    teamNames,
    completedSets: [],
    currentSetNumber: 1,
    points: [],
    sidesSwapped: false,
    chronoSeconds: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    finished: false,
  };
}
