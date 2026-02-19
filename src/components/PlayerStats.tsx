import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Point, Player, OFFENSIVE_ACTIONS, FAULT_ACTIONS } from '@/types/volleyball';

interface PlayerStatsProps {
  points: Point[];
  players: Player[];
  teamName: string;
}

export function PlayerStats({ points, players, teamName }: PlayerStatsProps) {
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, { scored?: boolean; faults?: boolean }>>({});

  const stats = useMemo(() => {
    return players.map(player => {
      const playerPoints = points.filter(p => p.playerId === player.id);
      const scored = playerPoints.filter(p => p.team === 'blue' && p.type === 'scored');
      const faultWins = playerPoints.filter(p => p.team === 'blue' && p.type === 'fault');
      // Negative: opponent scored attributed to this player, or this player's own faults
      const negatives = playerPoints.filter(p => p.team === 'red');

      const negativeCount = negatives.length;
      const scoredCount = scored.length + faultWins.length;
      const total = scoredCount + negativeCount;
      const efficiency = total > 0 ? (scoredCount / total * 100) : 0;

      // Breakdown for scored
      const scoredBreakdown = OFFENSIVE_ACTIONS.map(a => ({
        label: a.label,
        count: scored.filter(p => p.action === a.key).length,
      })).filter(b => b.count > 0);

      // Breakdown for negatives
      const faultBreakdown = [
        ...OFFENSIVE_ACTIONS.map(a => ({
          label: a.label,
          count: negatives.filter(p => p.type === 'scored' && p.action === a.key).length,
        })),
        ...FAULT_ACTIONS.map(a => ({
          label: a.label,
          count: negatives.filter(p => p.type === 'fault' && p.action === a.key).length,
        })),
      ].filter(b => b.count > 0);

      return {
        player,
        scored: scoredCount,
        faults: negativeCount,
        total,
        efficiency,
        scoredBreakdown,
        faultBreakdown,
      };
    }).filter(s => s.total > 0)
      .sort((a, b) => b.scored - a.scored);
  }, [points, players]);

  const toggleSection = (playerId: string, section: 'scored' | 'faults') => {
    setExpandedPlayers(prev => {
      const current = prev[playerId] || {};
      return { ...prev, [playerId]: { ...current, [section]: !current[section] } };
    });
  };

  if (stats.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2">
      <p className="text-xs font-bold text-team-blue uppercase tracking-wider">
        📊 Stats Individuelles — {teamName}
      </p>
      <div className="space-y-1.5">
        {stats.map(s => {
          const expanded = expandedPlayers[s.player.id] || {};
          return (
            <div key={s.player.id} className="bg-secondary/30 rounded-lg p-2.5 space-y-1.5">
              {/* Header: player name + totals */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-team-blue bg-team-blue/10 rounded px-1.5 py-0.5">#{s.player.number}</span>
                  <span className="text-xs font-semibold text-foreground">{s.player.name || '—'}</span>
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.efficiency >= 60 ? 'bg-green-500/10 text-green-500' : s.efficiency >= 40 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-destructive/10 text-destructive'}`}>
                  {s.efficiency.toFixed(0)}%
                </span>
              </div>

              {/* Toggleable scored / faults buttons */}
              <div className="flex gap-1.5">
                {s.scored > 0 && (
                  <button
                    onClick={() => toggleSection(s.player.id, 'scored')}
                    className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      expanded.scored ? 'bg-primary/15 text-primary' : 'bg-primary/5 text-primary hover:bg-primary/10'
                    }`}
                  >
                    <span>⚡ {s.scored} pts</span>
                    {expanded.scored ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
                {s.faults > 0 && (
                  <button
                    onClick={() => toggleSection(s.player.id, 'faults')}
                    className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      expanded.faults ? 'bg-destructive/15 text-destructive' : 'bg-destructive/5 text-destructive hover:bg-destructive/10'
                    }`}
                  >
                    <span>❌ {s.faults} fts</span>
                    {expanded.faults ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              {/* Scored breakdown */}
              {expanded.scored && s.scoredBreakdown.length > 0 && (
                <div className="pl-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {s.scoredBreakdown.map(b => (
                    <div key={b.label} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="font-bold text-foreground">{b.count}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Faults breakdown */}
              {expanded.faults && s.faultBreakdown.length > 0 && (
                <div className="pl-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {s.faultBreakdown.map(b => (
                    <div key={b.label} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="font-bold text-destructive">{b.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
