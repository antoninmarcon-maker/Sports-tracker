import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { SportType, PointType, getScoredActionsForSport, getFaultActionsForSport } from '@/types/sports';
import {
  getActionsConfig, toggleActionVisibility, addCustomAction,
  updateCustomAction, deleteCustomAction,
} from '@/lib/actionsConfig';
import type { ActionsConfig as ActionsConfigType } from '@/lib/actionsConfig';

const SPORTS: { key: SportType; icon: string }[] = [
  { key: 'volleyball', icon: '🏐' },
  { key: 'basketball', icon: '🏀' },
  { key: 'tennis', icon: '🎾' },
  { key: 'padel', icon: '🏓' },
];

// "Other" default actions that are hidden by default and should not appear in the list
const OTHER_DEFAULT_KEYS = [
  'other_offensive', 'other_volley_fault',
  'other_tennis_winner', 'other_tennis_fault',
  'other_padel_winner', 'other_padel_fault',
  'other_basket_fault',
];

export default function ActionsConfig() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ActionsConfigType>(getActionsConfig);
  const [sport, setSport] = useState<SportType>('volleyball');
  const [addingCategory, setAddingCategory] = useState<PointType | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newPoints, setNewPoints] = useState<number>(2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPoints, setEditPoints] = useState<number>(2);
  const handleToggle = useCallback((key: string) => {
    setConfig(toggleActionVisibility(key));
  }, []);

  const handleAdd = useCallback(() => {
    if (!newLabel.trim() || !addingCategory) return;
    const pts = (sport === 'basketball' && addingCategory === 'scored') ? newPoints : undefined;
    setConfig(addCustomAction(newLabel, sport, addingCategory, pts));
    setNewLabel('');
    setNewPoints(2);
    setAddingCategory(null);
  }, [newLabel, sport, addingCategory, newPoints]);

  const handleUpdate = useCallback((id: string) => {
    if (!editLabel.trim()) return;
    setConfig(updateCustomAction(id, editLabel, editPoints));
    setEditingId(null);
  }, [editLabel, editPoints]);

  const handleDelete = useCallback((id: string) => {
    setConfig(deleteCustomAction(id));
  }, []);

  const renderCategory = (category: PointType) => {
    const defaultActions = category === 'scored'
      ? getScoredActionsForSport(sport)
      : getFaultActionsForSport(sport);

    // Filter out the hidden "other" defaults from the visible list
    const visibleDefaults = defaultActions.filter(a => !OTHER_DEFAULT_KEYS.includes(a.key));

    const customs = config.customActions.filter(
      c => c.sport === sport && c.category === category
    );

    const categoryLabel = category === 'scored'
      ? t('actionsConfig.scored')
      : t('actionsConfig.faults');

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{categoryLabel}</h3>
          <button
            onClick={() => { setAddingCategory(category); setNewLabel(''); }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
          >
            <Plus size={14} /> {t('actionsConfig.addAction')}
          </button>
        </div>

        {/* Default actions */}
        {visibleDefaults.map(a => {
          const isHidden = config.hiddenActions.includes(a.key);
          return (
            <div
              key={a.key}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isHidden ? 'border-border/50 bg-muted/30 opacity-60' : 'border-border bg-card'
              }`}
            >
              <span className="text-sm font-medium text-foreground">
                {t(`actions.${a.key}`, a.label)}
                {'points' in a && a.points != null && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{a.points as number}</span>
                )}
              </span>
              <button
                onClick={() => handleToggle(a.key)}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                title={isHidden ? t('actionsConfig.show') : t('actionsConfig.hide')}
              >
                {isHidden ? (
                  <EyeOff size={16} className="text-muted-foreground" />
                ) : (
                  <Eye size={16} className="text-foreground" />
                )}
              </button>
            </div>
          );
        })}

        {/* Custom actions */}
        {customs.map(c => {
          const showPts = sport === 'basketball' && category === 'scored';
          return (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
            {editingId === c.id ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className="h-8 text-sm flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(c.id)}
                  autoFocus
                />
                {showPts && (
                  <div className="flex gap-1">
                    {[1, 2, 3].map(p => (
                      <button key={p} onClick={() => setEditPoints(p)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${editPoints === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                      >{p}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => handleUpdate(c.id)} className="p-1 text-primary">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground">
                  {c.label}
                  {showPts && c.points != null && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{c.points}</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingId(c.id); setEditLabel(c.label); setEditPoints(c.points ?? 2); }}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  >
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </>
            )}
          </div>
          );
        })}

        {/* Add form */}
        {addingCategory === category && (
          <div className="flex items-center gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5">
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder={t('actionsConfig.newActionPlaceholder')}
              className="h-8 text-sm flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            {sport === 'basketball' && category === 'scored' && (
              <div className="flex gap-1">
                {[1, 2, 3].map(p => (
                  <button key={p} onClick={() => setNewPoints(p)}
                    className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${newPoints === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                  >{p}</button>
                ))}
              </div>
            )}
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button onClick={() => setAddingCategory(null)} className="p-1 text-muted-foreground">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t('actionsConfig.title')}</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">{t('actionsConfig.description')}</p>

        <Tabs value={sport} onValueChange={v => setSport(v as SportType)}>
          <TabsList className="w-full grid grid-cols-4">
            {SPORTS.map(s => (
              <TabsTrigger key={s.key} value={s.key} className="text-xs">
                {s.icon} {t(`actionsConfig.${s.key}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {SPORTS.map(s => (
            <TabsContent key={s.key} value={s.key} className="space-y-6 mt-4">
              {renderCategory('scored')}
              {renderCategory('fault')}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
