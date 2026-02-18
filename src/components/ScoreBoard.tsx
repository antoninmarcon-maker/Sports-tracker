import { Undo2, RotateCcw, Flag, ArrowLeftRight, Play, Pause, Timer, Pencil } from 'lucide-react';
import { Team, PointType, ActionType } from '@/types/volleyball';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface ScoreBoardProps {
  score: { blue: number; red: number };
  selectedTeam: Team | null;
  selectedPointType: PointType;
  selectedAction: ActionType;
  currentSetNumber: number;
  teamNames: { blue: string; red: string };
  sidesSwapped: boolean;
  chronoRunning: boolean;
  chronoSeconds: number;
  onSelectTeam: (team: Team) => void;
  onSelectPointType: (type: PointType) => void;
  onSelectAction: (action: ActionType) => void;
  onUndo: () => void;
  onReset: () => void;
  onEndSet: () => void;
  onSwitchSides: () => void;
  onStartChrono: () => void;
  onPauseChrono: () => void;
  onSetTeamNames: (names: { blue: string; red: string }) => void;
  canUndo: boolean;
}

const ACTION_LABELS: { key: ActionType; label: string }[] = [
  { key: 'other', label: 'Out' },
  { key: 'service', label: 'Service' },
  { key: 'attack', label: 'Attaque loupée' },
  { key: 'block_out', label: 'Block Out' },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function ScoreBoard({
  score,
  selectedTeam,
  selectedPointType,
  selectedAction,
  onSelectTeam,
  onSelectPointType,
  onSelectAction,
  onUndo,
  onReset,
  onEndSet,
  onSwitchSides,
  onStartChrono,
  onPauseChrono,
  onSetTeamNames,
  canUndo,
  currentSetNumber,
  teamNames,
  sidesSwapped,
  chronoRunning,
  chronoSeconds,
}: ScoreBoardProps) {
  const [editingNames, setEditingNames] = useState(false);
  const [nameInputs, setNameInputs] = useState(teamNames);

  const left: Team = sidesSwapped ? 'red' : 'blue';
  const right: Team = sidesSwapped ? 'blue' : 'red';

  const saveNames = () => {
    onSetTeamNames({
      blue: nameInputs.blue.trim() || 'Bleue',
      red: nameInputs.red.trim() || 'Rouge',
    });
    setEditingNames(false);
  };

  return (
    <div className="space-y-3">
      {/* Set + Chrono */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Set {currentSetNumber}</p>
        <div className="flex items-center gap-2">
          <Timer size={14} className="text-muted-foreground" />
          <span className="text-sm font-mono font-bold text-foreground tabular-nums">{formatTime(chronoSeconds)}</span>
          <button
            onClick={chronoRunning ? onPauseChrono : onStartChrono}
            className="p-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
          >
            {chronoRunning ? <Pause size={12} /> : <Play size={12} />}
          </button>
        </div>
      </div>

      {/* Team names editing */}
      {editingNames ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-team-blue font-semibold">Équipe Bleue</label>
            <Input
              value={nameInputs.blue}
              onChange={e => setNameInputs(prev => ({ ...prev, blue: e.target.value }))}
              className="h-8 text-sm"
              placeholder="Bleue"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-team-red font-semibold">Équipe Rouge</label>
            <Input
              value={nameInputs.red}
              onChange={e => setNameInputs(prev => ({ ...prev, red: e.target.value }))}
              className="h-8 text-sm"
              placeholder="Rouge"
            />
          </div>
          <button onClick={saveNames} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground">
            OK
          </button>
        </div>
      ) : (
        <button onClick={() => { setNameInputs(teamNames); setEditingNames(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <Pencil size={10} /> Modifier les noms
        </button>
      )}

      {/* Score display */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[left]}</p>
          <p className={`text-5xl font-black tabular-nums ${left === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{score[left]}</p>
        </div>
        <div className="text-muted-foreground text-lg font-bold">VS</div>
        <div className="flex-1 text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{teamNames[right]}</p>
          <p className={`text-5xl font-black tabular-nums ${right === 'blue' ? 'text-team-blue' : 'text-team-red'}`}>{score[right]}</p>
        </div>
      </div>

      {/* Point type toggle */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => onSelectPointType('scored')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            selectedPointType === 'scored'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Point Marqué
        </button>
        <button
          onClick={() => onSelectPointType('fault')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            selectedPointType === 'fault'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Faute
        </button>
      </div>

      {/* Action type - only shown when Faute is selected */}
      {selectedPointType === 'fault' && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {ACTION_LABELS.map(a => (
            <button
              key={a.key}
              onClick={() => onSelectAction(a.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                selectedAction === a.key
                  ? 'bg-accent text-accent-foreground ring-1 ring-primary'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Team buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onSelectTeam(left)}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            selectedTeam === left
              ? `${left === 'blue' ? 'bg-team-blue text-team-blue-foreground team-blue-glow' : 'bg-team-red text-team-red-foreground team-red-glow'} scale-105`
              : `${left === 'blue' ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30' : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'}`
          }`}
        >
          {left === 'blue' ? '🔵' : '🔴'} {teamNames[left]}
        </button>
        <button
          onClick={() => onSelectTeam(right)}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 ${
            selectedTeam === right
              ? `${right === 'blue' ? 'bg-team-blue text-team-blue-foreground team-blue-glow' : 'bg-team-red text-team-red-foreground team-red-glow'} scale-105`
              : `${right === 'blue' ? 'bg-team-blue/20 text-team-blue border-2 border-team-blue/30 hover:bg-team-blue/30' : 'bg-team-red/20 text-team-red border-2 border-team-red/30 hover:bg-team-red/30'}`
          }`}
        >
          {right === 'blue' ? '🔵' : '🔴'} {teamNames[right]}
        </button>
      </div>

      {/* Status */}
      {selectedTeam && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Touchez le terrain pour placer le point
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
        >
          <Undo2 size={16} /> Annuler
        </button>
        <button
          onClick={onSwitchSides}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
        >
          <ArrowLeftRight size={16} /> Switch
        </button>
        <button
          onClick={onEndSet}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-30 transition-all"
        >
          <Flag size={16} /> Fin du Set
        </button>
        <button
          onClick={onReset}
          disabled={!canUndo}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-all"
        >
          <RotateCcw size={16} /> Reset
        </button>
      </div>
    </div>
  );
}
