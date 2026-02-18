import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Activity, BarChart3, HelpCircle, X, ArrowLeft } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { HeatmapView } from '@/components/HeatmapView';
import { SetHistory } from '@/components/SetHistory';
import { getMatch } from '@/lib/matchStorage';

type Tab = 'match' | 'stats';

const Index = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('match');
  const [showHelp, setShowHelp] = useState(false);

  if (!matchId || !getMatch(matchId)) {
    return <Navigate to="/" replace />;
  }

  const {
    points,
    allPoints,
    selectedTeam,
    selectedPointType,
    selectedAction,
    score,
    stats,
    setsScore,
    currentSetNumber,
    completedSets,
    teamNames,
    sidesSwapped,
    chronoRunning,
    chronoSeconds,
    setTeamNames,
    selectAction,
    cancelSelection,
    addPoint,
    undo,
    endSet,
    resetMatch,
    switchSides,
    startChrono,
    pauseChrono,
  } = useMatchState(matchId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-foreground tracking-tight text-center">
          🏐 Volley Tracker
        </h1>
        {tab === 'match' ? (
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle size={18} />
          </button>
        ) : <div className="w-[30px]" />}
      </header>

      <nav className="flex border-b border-border">
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'match' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <Activity size={16} /> Match
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
            tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          <BarChart3 size={16} /> Statistiques
        </button>
      </nav>

      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
        {tab === 'match' ? (
          <div className="space-y-4">
            <SetHistory
              completedSets={completedSets}
              currentSetNumber={currentSetNumber}
              setsScore={setsScore}
              teamNames={teamNames}
            />
            <ScoreBoard
              score={score}
              selectedTeam={selectedTeam}
              selectedAction={selectedAction}
              currentSetNumber={currentSetNumber}
              teamNames={teamNames}
              sidesSwapped={sidesSwapped}
              chronoRunning={chronoRunning}
              chronoSeconds={chronoSeconds}
              onSelectAction={selectAction}
              onCancelSelection={cancelSelection}
              onUndo={undo}
              onEndSet={endSet}
              onReset={resetMatch}
              onSwitchSides={switchSides}
              onStartChrono={startChrono}
              onPauseChrono={pauseChrono}
              onSetTeamNames={setTeamNames}
              canUndo={points.length > 0}
            />
            <VolleyballCourt
              points={points}
              selectedTeam={selectedTeam}
              selectedAction={selectedAction}
              selectedPointType={selectedPointType}
              sidesSwapped={sidesSwapped}
              teamNames={teamNames}
              onCourtClick={addPoint}
            />
          </div>
        ) : (
          <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} />
        )}
      </main>
      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-3 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-foreground">Comment utiliser l'app ?</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong className="text-foreground">1. Appuyez sur "+"</strong> sous le score de l'équipe concernée.</p>
              <p><strong className="text-foreground">2. Choisissez la catégorie</strong> : "Points Gagnés" ou "Fautes Commises".</p>
              <p><strong className="text-foreground">3. Sélectionnez l'action</strong> : Attaque, Ace, Block, Out, Filet, etc.</p>
              <p><strong className="text-foreground">4. Placez sur le terrain</strong> : Seule la zone autorisée est cliquable (le reste est grisé).</p>
              <p><strong className="text-foreground">5. Gestion des sets</strong> : "Fin du Set" pour terminer, "Switch" pour inverser les côtés.</p>
              <p><strong className="text-foreground">6. Statistiques</strong> : L'onglet Stats affiche le détail par set avec heatmap des actions offensives.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
