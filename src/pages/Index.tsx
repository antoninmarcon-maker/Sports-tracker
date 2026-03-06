import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Activity, BarChart3, HelpCircle, X, ArrowLeft } from 'lucide-react';
import { useMatchState } from '@/hooks/useMatchState';
import { useTennisScore } from '@/hooks/useTennisScore';
import { ScoreBoard } from '@/components/ScoreBoard';
import { VolleyballCourt } from '@/components/VolleyballCourt';
import { BasketballCourt } from '@/components/BasketballCourt';
import { TennisCourt } from '@/components/TennisCourt';
import { PadelCourt } from '@/components/PadelCourt';
import { HeatmapView } from '@/components/HeatmapView';
import { SetHistory } from '@/components/SetHistory';
import { PlayerRoster } from '@/components/PlayerRoster';
import { PlayerSelector } from '@/components/PlayerSelector';
import { PlayByPlayNavigator } from '@/components/PlayByPlayNavigator';
import { AiAnalysis } from '@/components/AiAnalysis';
import { AuthDialog } from '@/components/AuthDialog';
import { getMatch, saveMatch } from '@/lib/matchStorage';
import { getCloudMatchById, saveCloudMatch } from '@/lib/cloudStorage';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { MatchSummary, Player, Team, Point, RallyAction } from '@/types/sports';
import { useTranslation } from 'react-i18next';

type Tab = 'match' | 'stats';

const Index = () => {
  const { t } = useTranslation();
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('match');
  const [showHelp, setShowHelp] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthForAi, setShowAuthForAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchReady, setMatchReady] = useState(false);

  // --- Play-by-Play Visualization states ---
  const [viewingPointIndex, setViewingPointIndex] = useState<number | null>(null);
  const [viewingActionIndex, setViewingActionIndex] = useState<number>(0);
  const [cumulativeMode, setCumulativeMode] = useState(true);

  // --- Replay mode (finished matches) ---
  const [replaySetIndex, setReplaySetIndex] = useState<number | null>(null);

  // Performance mode: show player selector BEFORE court click
  const [awaitingPlayerBeforeCourt, setAwaitingPlayerBeforeCourt] = useState(false);

  // Performance mode: show rating selector AFTER player selection, BEFORE court click
  const [awaitingRating, setAwaitingRating] = useState(false);

  // On mount: ensure match exists in localStorage (fetch from cloud if needed)
  useEffect(() => {
    if (!matchId) { setLoading(false); return; }

    const ensureMatchLocal = async () => {
      if (getMatch(matchId)) {
        setMatchReady(true);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const cloudMatch = await getCloudMatchById(matchId);
        if (cloudMatch) {
          saveMatch(cloudMatch);
          setMatchReady(true);
          setLoading(false);
          return;
        }
      }
      setMatchReady(false);
      setLoading(false);
    };

    ensureMatchLocal();
  }, [matchId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const matchState = useMatchState(matchId ?? '', matchReady);

  const {
    points, allPoints, selectedTeam, selectedPointType, selectedAction,
    score, stats, setsScore, currentSetNumber, completedSets,
    teamNames, sidesSwapped, chronoRunning, chronoSeconds,
    players, pendingPoint, servingTeam, sport,
    isPerformanceMode, currentRallyActions, rallyInProgress, directionOrigin, pendingDirectionAction, canUndo,
    preSelectedPlayerId, setPreSelectedPlayerId, preSelectedRating, setPreSelectedRating,
    initialServer, setInitialServer,
    setTeamNames, setPlayers, selectAction, cancelSelection, addPoint,
    assignPlayer, skipPlayerAssignment,
    undo, endSet, startNewSet, waitingForNewSet, lastEndedSetScore, resetMatch, switchSides, startChrono, pauseChrono,
    addFreeThrow,
  } = matchState;

  const matchData = getMatch(matchId ?? '');
  const isFinished = matchData?.finished ?? false;
  const isBasketball = sport === 'basketball';
  const isTennisOrPadel = sport === 'tennis' || sport === 'padel';
  const metadata = matchData?.metadata;

  // --- Play-by-Play helpers ---
  const playerAliases = matchData?.metadata?.playerAliases ?? {};
  const isViewingMode = viewingPointIndex !== null;
  const isInReplayView = isFinished && viewingPointIndex !== null;
  const isOverview = viewingPointIndex === null;

  const replaySetAllPoints = useMemo(() => {
    if (!isFinished || replaySetIndex === null || !completedSets[replaySetIndex]) return [];
    return completedSets[replaySetIndex].points;
  }, [isFinished, replaySetIndex, completedSets]);

  const replayNavPoints = useMemo(() => {
    const allPts = replaySetAllPoints;
    const result: Point[] = [];
    let pendingNeutrals: Point[] = [];
    for (const p of allPts) {
      if (p.type === 'neutral') {
        pendingNeutrals.push(p);
      } else {
        if (p.rallyActions && p.rallyActions.length > 0) {
          result.push(p);
        } else {
          const reconstructed: RallyAction[] = [
            ...pendingNeutrals.map(n => ({ id: n.id, team: n.team, type: n.type, action: n.action, x: n.x, y: n.y, playerId: n.playerId, timestamp: n.timestamp, customActionLabel: n.customActionLabel, sigil: n.sigil, showOnCourt: n.showOnCourt } as RallyAction)),
            { id: p.id, team: p.team, type: p.type, action: p.action, x: p.x, y: p.y, playerId: p.playerId, timestamp: p.timestamp, customActionLabel: p.customActionLabel, sigil: p.sigil } as RallyAction,
          ];
          result.push({ ...p, rallyActions: reconstructed.length > 1 ? reconstructed : undefined });
        }
        pendingNeutrals = [];
      }
    }
    return result;
  }, [replaySetAllPoints]);

  const viewingCourtData = useMemo(() => {
    if (viewingPointIndex === null) return { actions: [], point: null };
    const pts = isFinished ? replayNavPoints : allPoints;
    const point = pts[viewingPointIndex];
    if (!point) return { actions: [], point: null };
    const rallyActions = point.rallyActions ?? [];
    if (rallyActions.length > 0) {
      if (cumulativeMode) return { actions: rallyActions.slice(0, viewingActionIndex + 1), point: null };
      const action = rallyActions[viewingActionIndex] ?? null;
      return { actions: action ? [action] : [], point: null };
    }
    return { actions: [], point };
  }, [viewingPointIndex, viewingActionIndex, allPoints, replayNavPoints, isFinished, cumulativeMode]);

  const courtPoints = useMemo(() => {
    if (isFinished) return replaySetAllPoints;
    return points;
  }, [isFinished, replaySetAllPoints, points]);

  const handleSelectViewPoint = useCallback((index: number) => { setViewingPointIndex(index); setViewingActionIndex(0); }, []);
  const handleChangePoint = useCallback((index: number | null) => { setViewingPointIndex(index); setViewingActionIndex(0); }, []);
  const handleChangeAction = useCallback((index: number) => { setViewingActionIndex(index); }, []);
  const handleBackToLive = useCallback(() => { setViewingPointIndex(null); setViewingActionIndex(0); }, []);
  const handleSelectReplaySet = useCallback((index: number) => { setReplaySetIndex(index); setViewingPointIndex(null); setViewingActionIndex(0); }, []);

  // For tennis/padel: compute initial server for current set based on match initial server + completed sets
  const currentSetInitialServer = useMemo(() => {
    if (!initialServer) return 'blue' as const;
    const otherTeam: 'blue' | 'red' = initialServer === 'blue' ? 'red' : 'blue';
    // Server alternates each set
    return (completedSets.length % 2 === 0) ? initialServer : otherTeam;
  }, [initialServer, completedSets.length]);

  const tennisScore = useTennisScore(isTennisOrPadel ? points.filter(p => p.type !== 'neutral') : [], metadata, currentSetInitialServer);
  const effectiveServingTeam = isTennisOrPadel ? tennisScore.servingTeam : servingTeam;

  // Helper: get players belonging to a specific team (for racket sports)
  const getPlayersForTeam = useCallback((team: Team): Player[] => {
    if (!isTennisOrPadel) return players;
    const teamName = teamNames[team];
    const names = teamName.split(' / ').map(n => n.trim());
    return players.filter(p => names.includes(p.name));
  }, [isTennisOrPadel, players, teamNames]);


  // --- Initialize replay mode for finished matches ---
  useEffect(() => {
    if (isFinished && completedSets.length > 0 && replaySetIndex === null) {
      setReplaySetIndex(completedSets.length - 1);
      setViewingPointIndex(null);
      setViewingActionIndex(0);
    }
  }, [isFinished, completedSets.length, replaySetIndex]);

  // Tennis/Padel: auto end set
  useEffect(() => {
    if (!isTennisOrPadel) return;
    if (tennisScore.setJustWon && points.length > 0 && !waitingForNewSet) {
      endSet();
    }
  }, [tennisScore.setJustWon, isTennisOrPadel, points.length, waitingForNewSet, endSet]);

  useEffect(() => {
    if (isBasketball && selectedAction === 'free_throw' && selectedTeam) {
      addFreeThrow();
    }
  }, [isBasketball, selectedAction, selectedTeam, addFreeThrow]);

  // Auto-point logic: service faults, tennis opponent faults, custom no-court actions
  // Also handles Performance Mode: player/rating pre-selection before court click
  const SERVICE_FAULT_ACTIONS = ['service_miss', 'double_fault', 'padel_double_fault', 'timeout', 'first_serve_fault', 'padel_first_serve_fault'];
  useEffect(() => {
    if (!selectedTeam || !selectedAction) {
      delete (window as any).__pendingPlaceOnCourt;
      delete (window as any).__pendingHasRating;
      setAwaitingPlayerBeforeCourt(false);
      setAwaitingRating(false);
      return;
    }
    const needsAssignToPlayer = (window as any).__pendingCustomAssignToPlayer !== false;
    const needsCourtPlacement = (window as any).__pendingPlaceOnCourt !== false
      && metadata?.hasCourt !== false
      && !SERVICE_FAULT_ACTIONS.includes(selectedAction)
      && !(isTennisOrPadel && matchState.selectedPointType === 'fault');
    const needsRating = (window as any).__pendingHasRating === true;

    // Performance mode: show player selector BEFORE court click
    if (isPerformanceMode && needsAssignToPlayer && needsCourtPlacement && players.length > 0 && !preSelectedPlayerId) {
      setAwaitingPlayerBeforeCourt(true);
      return;
    }

    // Performance mode: show rating selector BEFORE court click
    if (isPerformanceMode && needsRating && !preSelectedRating) {
      setAwaitingRating(true);
      return;
    }

    setAwaitingRating(false);

    const isAutoPoint =
      metadata?.hasCourt === false ||
      (isTennisOrPadel && matchState.selectedPointType === 'fault') ||
      SERVICE_FAULT_ACTIONS.includes(selectedAction) ||
      (window as any).__pendingPlaceOnCourt === false;
    if (isAutoPoint) {
      delete (window as any).__pendingPlaceOnCourt;
      addPoint(0.5, 0.5);
    }
  }, [matchState.selectedPointType, selectedTeam, selectedAction, addPoint, isPerformanceMode, players.length, preSelectedPlayerId, preSelectedRating]);

  useEffect(() => {
    if (!pendingPoint || players.length === 0) return;

    // Respect explicit assignToPlayer=false from custom action config (all types)
    if ((window as any).__pendingCustomAssignToPlayer === false) {
      delete (window as any).__pendingCustomAssignToPlayer;
      skipPlayerAssignment();
      return;
    }
    // Clean up the flag
    if ((window as any).__pendingCustomAssignToPlayer !== undefined) {
      delete (window as any).__pendingCustomAssignToPlayer;
    }

    if (isBasketball) {
      const isBlueFault = pendingPoint.team === 'blue' && pendingPoint.type === 'fault';
      const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
      const isNeutral = pendingPoint.type === 'neutral';
      if (!isBlueFault && !isBlueScored && !isNeutral) {
        skipPlayerAssignment();
      }
      return;
    }
    // Tennis/Padel: smart player filtering
    if (isTennisOrPadel) {
      const SERVICE_PLAYER_ACTIONS = ['tennis_ace', 'padel_ace', 'double_fault', 'padel_double_fault'];
      const isServiceAction = SERVICE_PLAYER_ACTIONS.includes(pendingPoint.action);

      let relevantPlayers: Player[];
      if (isServiceAction) {
        relevantPlayers = getPlayersForTeam(effectiveServingTeam);
      } else if (pendingPoint.type === 'scored') {
        relevantPlayers = getPlayersForTeam(pendingPoint.team);
      } else if (pendingPoint.team === 'red' && pendingPoint.type === 'fault') {
        // Blue committed a fault → attribute to blue player
        relevantPlayers = getPlayersForTeam('blue');
      } else if (pendingPoint.type === 'neutral') {
        relevantPlayers = getPlayersForTeam(pendingPoint.team);
      } else {
        // Opponent fault → skip
        skipPlayerAssignment();
        return;
      }

      if (relevantPlayers.length === 0) { skipPlayerAssignment(); return; }
      if (relevantPlayers.length === 1) { assignPlayer(relevantPlayers[0].id); return; }
      return; // Show selector in JSX
    }
    // Volleyball default
    const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
    const isRedScored = pendingPoint.team === 'red' && pendingPoint.type === 'scored';
    const isRedFault = pendingPoint.team === 'red' && pendingPoint.type === 'fault';
    const isNeutral = pendingPoint.type === 'neutral';
    if (!isBlueScored && !isRedScored && !isRedFault && !isNeutral) {
      skipPlayerAssignment();
    }
  }, [pendingPoint, players, skipPlayerAssignment, isBasketball, isTennisOrPadel, effectiveServingTeam, getPlayersForTeam, assignPlayer]);

  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCloudSaveRef = useRef<string>('');

  const saveToCloud = useCallback(() => {
    if (!user || !matchId) return;
    const match = getMatch(matchId);
    if (!match) return;
    const snapshot = JSON.stringify(match);
    if (snapshot === lastCloudSaveRef.current) return;
    lastCloudSaveRef.current = snapshot;
    saveCloudMatch(user.id, match).catch(err => { if (import.meta.env.DEV) console.error('[CloudSync] save failed:', err); }
    );
  }, [user, matchId]);

  useEffect(() => {
    if (!user || !matchId || !matchReady) return;
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = setTimeout(() => {
      saveToCloud();
    }, 3000);
    return () => {
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    };
  }, [points, completedSets, players, teamNames, chronoSeconds, sidesSwapped, user, matchId, matchReady, saveToCloud]);

  useEffect(() => {
    return () => {
      if (user && matchId) {
        const match = getMatch(matchId);
        if (match) {
          saveCloudMatch(user.id, match).catch(() => { });
        }
      }
    };
  }, [user, matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('matchPage.loadingMatch')}</div>
      </div>
    );
  }

  if (!matchId || !matchReady) {
    return <Navigate to="/" replace />;
  }

  const sportIcon = sport === 'basketball' ? '🏀' : sport === 'tennis' ? '🎾' : sport === 'padel' ? '🏓' : '🏐';
  const sportTitle: Record<string, string> = { volleyball: 'Sports Tracker', basketball: 'Sports Tracker', tennis: 'Sports Tracker', padel: 'Sports Tracker' };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-foreground tracking-tight text-center">
          {sportIcon} {sportTitle[sport] || 'Sports Tracker'}
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

      <nav className="sticky top-[49px] z-40 bg-background flex border-b border-border">
        <button
          onClick={() => setTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'match' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
        >
          <Activity size={16} /> {t('common.match')}
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${tab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
        >
          <BarChart3 size={16} /> {t('common.stats')}
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
              isFinished={isFinished}
              sport={sport}
              selectedSetIndex={isFinished ? replaySetIndex : undefined}
              onSelectSet={isFinished ? handleSelectReplaySet : undefined}
            />
            {!isTennisOrPadel && (
              <PlayerRoster
                players={players}
                onSetPlayers={setPlayers}
                teamName={teamNames.blue}
                sport={sport}
                userId={user?.id}
                readOnly={isFinished}
              />
            )}
            <ScoreBoard
              score={isFinished && replaySetIndex !== null && completedSets[replaySetIndex]
                ? completedSets[replaySetIndex].score
                : score}
              points={isFinished ? replaySetAllPoints : points}
              selectedTeam={selectedTeam}
              selectedPointType={selectedPointType}
              selectedAction={selectedAction}
              currentSetNumber={isFinished && replaySetIndex !== null && completedSets[replaySetIndex]
                ? completedSets[replaySetIndex].number
                : currentSetNumber}
              teamNames={teamNames}
              sidesSwapped={sidesSwapped}
              chronoRunning={chronoRunning}
              chronoSeconds={chronoSeconds}
              servingTeam={effectiveServingTeam}
              sport={sport}
              metadata={metadata}
              initialServer={initialServer}
              onSetInitialServer={setInitialServer}
              onSelectAction={selectAction}
              onCancelSelection={cancelSelection}
              onUndo={undo}
              onEndSet={endSet}
              onReset={resetMatch}
              onSwitchSides={switchSides}
              onStartChrono={startChrono}
              onPauseChrono={pauseChrono}
              onSetTeamNames={setTeamNames}
              canUndo={canUndo}
              isFinished={isFinished}
              waitingForNewSet={isFinished ? false : waitingForNewSet}
              onStartNewSet={startNewSet}
            />

            {/* Direction mode indicator (live only) */}
            {!isFinished && pendingDirectionAction && directionOrigin && (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-accent/50 border border-accent animate-pulse">
                <span className="text-xs font-bold text-accent-foreground">🎯 Touchez la destination sur le terrain</span>
                <button onClick={cancelSelection} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Play-by-Play Navigator: replay mode */}
            {isFinished && replayNavPoints.length > 0 && (
              <PlayByPlayNavigator
                points={replayNavPoints}
                viewingPointIndex={viewingPointIndex}
                viewingActionIndex={viewingActionIndex}
                onChangePoint={handleChangePoint}
                onChangeAction={handleChangeAction}
                isReplayMode={true}
                isPerformanceMode={isPerformanceMode}
                cumulativeMode={cumulativeMode}
                onToggleCumulative={setCumulativeMode}
              />
            )}
            {/* Play-by-Play Navigator: live visit mode */}
            {!isFinished && isViewingMode && (
              <PlayByPlayNavigator
                points={allPoints}
                viewingPointIndex={viewingPointIndex}
                viewingActionIndex={viewingActionIndex}
                onChangePoint={handleChangePoint}
                onChangeAction={handleChangeAction}
                onBackToLive={handleBackToLive}
                isPerformanceMode={isPerformanceMode}
                cumulativeMode={cumulativeMode}
                onToggleCumulative={setCumulativeMode}
              />
            )}
            {metadata?.hasCourt !== false && (
              sport === 'basketball' ? (
                <BasketballCourt points={isFinished && isOverview ? replaySetAllPoints : (isFinished ? [] : courtPoints)} selectedTeam={isInReplayView ? null : selectedTeam} selectedAction={isInReplayView ? null : selectedAction} selectedPointType={isInReplayView ? null : selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} />
              ) : sport === 'tennis' ? (
                <TennisCourt points={isFinished && isOverview ? replaySetAllPoints : (isFinished ? [] : courtPoints)} selectedTeam={isInReplayView ? null : selectedTeam} selectedAction={isInReplayView ? null : selectedAction} selectedPointType={isInReplayView ? null : selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} matchFormat={(metadata as any)?.matchFormat} servingSide={tennisScore.servingSide} />
              ) : sport === 'padel' ? (
                <PadelCourt points={isFinished && isOverview ? replaySetAllPoints : (isFinished ? [] : courtPoints)} selectedTeam={isInReplayView ? null : selectedTeam} selectedAction={isInReplayView ? null : selectedAction} selectedPointType={isInReplayView ? null : selectedPointType} sidesSwapped={sidesSwapped} teamNames={teamNames} onCourtClick={addPoint} servingSide={tennisScore.servingSide} />
              ) : (
                <VolleyballCourt
                  points={isFinished && isOverview ? replaySetAllPoints : (isFinished ? [] : courtPoints)}
                  selectedTeam={isInReplayView ? null : (pendingDirectionAction ? null : selectedTeam)}
                  selectedAction={isInReplayView ? null : (pendingDirectionAction ? null : selectedAction)}
                  selectedPointType={isInReplayView ? null : (pendingDirectionAction ? null : selectedPointType)}
                  sidesSwapped={sidesSwapped}
                  teamNames={teamNames}
                  onCourtClick={addPoint}
                  directionOrigin={isInReplayView ? null : directionOrigin}
                  pendingDirectionAction={isInReplayView ? false : !!pendingDirectionAction}
                  isViewingMode={isInReplayView}
                  isPerformanceMode={isPerformanceMode}
                  viewingActions={viewingCourtData.actions}
                  activeRallyActions={currentRallyActions}
                  viewingPoint={viewingCourtData.point}
                  playerAliases={playerAliases}
                />
              )
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <AiAnalysis
                points={allPoints}
                completedSets={completedSets}
                currentSetPoints={points}
                teamNames={teamNames}
                players={players}
                sport={sport}
                isLoggedIn={!!user}
                onLoginRequired={() => setShowAuthForAi(true)}
                finished={isFinished}
                matchId={matchId}
              />
            </div>
            {metadata?.hasCourt === false ? (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} hasCourt={false} />
            ) : (
              <HeatmapView points={allPoints} completedSets={completedSets} currentSetPoints={points} currentSetNumber={currentSetNumber} stats={stats} teamNames={teamNames} players={players} sport={sport} matchId={matchId} isLoggedIn={!!user} />
            )}
          </div>
        )}

        {/* Pre-court player selector (Performance mode: Action→Player→Court flow) */}
        {!isFinished && awaitingPlayerBeforeCourt && selectedTeam && selectedAction && players.length > 0 && (
          <PlayerSelector
            players={players}
            prompt={t('playerSelector.whoDidAction')}
            onSelect={(playerId) => {
              setPreSelectedPlayerId(playerId);
              setAwaitingPlayerBeforeCourt(false);
            }}
            onSkip={() => {
              setPreSelectedPlayerId(null);
              setAwaitingPlayerBeforeCourt(false);
            }}
            sport={sport}
          />
        )}

        {/* Post-court player selector (Standard mode or performance mode without court) */}
        {!awaitingPlayerBeforeCourt && pendingPoint && players.length > 0 && (() => {
          // Neutral points: always show player selector
          if (pendingPoint.type === 'neutral') {
            return (
              <PlayerSelector
                players={players}
                prompt={t('playerSelector.whoDidAction')}
                onSelect={assignPlayer}
                onSkip={skipPlayerAssignment}
                sport={sport}
              />
            );
          }

          if (isBasketball) {
            const isBlueFault = pendingPoint.team === 'blue' && pendingPoint.type === 'fault';
            const isBlueScored = pendingPoint.team === 'blue' && pendingPoint.type === 'scored';
            if (!isBlueFault && !isBlueScored) return null;
            return (
              <PlayerSelector
                players={players}
                prompt={isBlueFault ? t('playerSelector.whoFaulted') : t('playerSelector.whoScored')}
                onSelect={assignPlayer}
                onSkip={skipPlayerAssignment}
                sport={sport}
              />
            );
          }

          if (isTennisOrPadel) {
            const SERVICE_PLAYER_ACTIONS = ['tennis_ace', 'padel_ace', 'double_fault', 'padel_double_fault'];
            const isServiceAction = SERVICE_PLAYER_ACTIONS.includes(pendingPoint.action);

            let filteredPlayers: Player[];
            let prompt: string;

            if (isServiceAction) {
              filteredPlayers = getPlayersForTeam(effectiveServingTeam);
              prompt = pendingPoint.type === 'scored' ? t('playerSelector.whoScored') : t('playerSelector.whoFaulted');
            } else if (pendingPoint.type === 'scored') {
              filteredPlayers = getPlayersForTeam(pendingPoint.team);
              prompt = t('playerSelector.whoScored');
            } else if (pendingPoint.team === 'red' && pendingPoint.type === 'fault') {
              filteredPlayers = getPlayersForTeam('blue');
              prompt = t('playerSelector.whoFaulted');
            } else {
              return null;
            }

            if (filteredPlayers.length === 0) return null;

            return (
              <PlayerSelector
                players={filteredPlayers}
                prompt={prompt}
                onSelect={assignPlayer}
                onSkip={skipPlayerAssignment}
                sport={sport}
              />
            );
          }

          // Volleyball default
          const showSelector = pendingPoint.type === 'scored' || (pendingPoint.team === 'red' && pendingPoint.type === 'fault');
          if (!showSelector) return null;
          const isFaultByBlue = pendingPoint.team === 'red' && (pendingPoint.type === 'fault' || pendingPoint.type === 'scored');
          return (
            <PlayerSelector
              players={players}
              prompt={isFaultByBlue ? t('playerSelector.whoFaulted') : t('playerSelector.whoScored')}
              onSelect={assignPlayer}
              onSkip={skipPlayerAssignment}
              sport={sport}
            />
          );
        })()}

      </main>

      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border space-y-3 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-foreground">{t('matchPage.helpTitle')}</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              {isBasketball ? (
                <>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP1')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP2')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP3')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP4')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpBasketP5')}</strong></p>
                </>
              ) : isTennisOrPadel ? (
                <>
                  <p><strong className="text-foreground">{t('matchPage.helpTennisP1')}</strong></p>
                  <p><strong className="text-foreground">{t(sport === 'padel' ? 'matchPage.helpTennisP2_padel' : 'matchPage.helpTennisP2_tennis')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpTennisP3')}</strong></p>
                  <p><strong className="text-foreground">{t(sport === 'padel' ? 'matchPage.helpTennisP4_padel' : 'matchPage.helpTennisP4')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpTennisP5')}</strong></p>
                </>
              ) : (
                <>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP1')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP2')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP3')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP4')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP5')}</strong></p>
                  <p><strong className="text-foreground">{t('matchPage.helpVolleyP6')}</strong></p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthDialog
        open={showAuthForAi}
        onOpenChange={setShowAuthForAi}
        message={t('auth.requiresLogin')}
      />
    </div>
  );
};

export default Index;
