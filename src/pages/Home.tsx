import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Trash2, Eye, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getAllMatches, createNewMatch, saveMatch, setActiveMatchId, deleteMatch } from '@/lib/matchStorage';
import { MatchSummary } from '@/types/volleyball';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function matchScore(match: MatchSummary) {
  const blue = match.completedSets.filter(s => s.winner === 'blue').length;
  const red = match.completedSets.filter(s => s.winner === 'red').length;
  return { blue, red };
}

export default function Home() {
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [names, setNames] = useState({ blue: '', red: '' });
  const [matches, setMatches] = useState<MatchSummary[]>(() => getAllMatches().sort((a, b) => b.updatedAt - a.updatedAt));

  const handleCreate = () => {
    const match = createNewMatch({
      blue: names.blue.trim() || 'Bleue',
      red: names.red.trim() || 'Rouge',
    });
    saveMatch(match);
    setActiveMatchId(match.id);
    navigate(`/match/${match.id}`);
  };

  const handleDelete = (id: string) => {
    deleteMatch(id);
    setMatches(getAllMatches().sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleResume = (id: string) => {
    setActiveMatchId(id);
    navigate(`/match/${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-6 border-b border-border">
        <h1 className="text-2xl font-black text-foreground tracking-tight text-center">
          🏐 Volley Tracker
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Suivi de matchs de volley-ball</p>
      </header>

      <main className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full space-y-6">
        {/* New match */}
        {!showNew ? (
          <button
            onClick={() => setShowNew(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg transition-all active:scale-[0.98] hover:opacity-90"
          >
            <Plus size={22} /> Nouveau Match
          </button>
        ) : (
          <div className="bg-card rounded-xl p-5 border border-border space-y-4">
            <h2 className="text-base font-bold text-foreground">Créer un match</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-team-blue mb-1 block">Équipe Bleue</label>
                <Input
                  value={names.blue}
                  onChange={e => setNames(prev => ({ ...prev, blue: e.target.value }))}
                  placeholder="Nom de l'équipe bleue"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-team-red mb-1 block">Équipe Rouge</label>
                <Input
                  value={names.red}
                  onChange={e => setNames(prev => ({ ...prev, red: e.target.value }))}
                  placeholder="Nom de l'équipe rouge"
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <Play size={16} /> Commencer
              </button>
            </div>
          </div>
        )}

        {/* Match history */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Matchs précédents</h2>
          </div>

          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun match enregistré</p>
          ) : (
            <div className="space-y-2">
              {matches.map(match => {
                const sc = matchScore(match);
                const totalPoints = match.completedSets.reduce((sum, s) => sum + s.points.length, 0) + match.points.length;
                return (
                  <div key={match.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-team-blue">{match.teamNames.blue}</span>
                          <span className="text-muted-foreground text-xs">vs</span>
                          <span className="text-team-red">{match.teamNames.red}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(match.updatedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-foreground tabular-nums">{sc.blue} - {sc.red}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {match.finished ? 'Terminé' : `Set ${match.currentSetNumber} en cours`} · {totalPoints} pts
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResume(match.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 text-primary font-semibold text-xs border border-primary/20 hover:bg-primary/25 transition-all"
                      >
                        {match.finished ? <><Eye size={14} /> Voir</> : <><Play size={14} /> Reprendre</>}
                      </button>
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
