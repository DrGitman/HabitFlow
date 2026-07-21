import { useState } from 'react';
/**
 * Coach page — AI-powered daily planning assistant.
 *
 * Three modes:
 *   Today's Focus  — picks the 3 most important things to do today
 *   Recovery       — reduces load when the user is overloaded
 *   Weekly Review  — reflects on last week and suggests one small adjustment
 *
 * How it works:
 *   1. POST /api/coach/generate — read-only, never touches the DB
 *   2. User selects which suggestions to apply
 *   3. POST /api/coach/apply  — re-validates then writes selected items
 *
 * Nothing changes until the user explicitly confirms. Every recommendation
 * shows the reasoning and evidence behind it.
 */
import { Brain, Zap, CalendarDays, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Clock, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

// ---------------------------------------------------------------------------
// Types (mirrors backend schemas)
// ---------------------------------------------------------------------------

type CoachMode = 'daily' | 'recovery' | 'weekly';

interface EvidenceItem {
  type: string;
  source_id: string | null;
  detail: string;
}

interface ProposedAction {
  type: string;
  task_id: string | null;
  habit_id: string | null;
  start: string | null;
  end: string | null;
  new_priority: string | null;
}

interface Recommendation {
  id: string;
  kind: string;
  title: string;
  reason: string;
  evidence: EvidenceItem[];
  confidence: number;
  proposed_action: ProposedAction;
  requires_confirmation: boolean;
}

interface CoachSummary {
  headline: string;
  detail: string;
}

interface CoachResponse {
  type: CoachMode;
  summary: CoachSummary;
  recommendations: Recommendation[];
  warnings: string[];
  evidence: EvidenceItem[];
  actions: unknown[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: 'High confidence', color: 'text-[#39d353]' };
  if (score >= 0.55) return { label: 'Medium confidence', color: 'text-[#ffd93d]' };
  return { label: 'Low confidence', color: 'text-[#ff7b72]' };
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    schedule_task: 'Schedule',
    defer_task: 'Defer',
    reduce_scope: 'Reduce scope',
    complete_habit: 'Complete habit',
    preserve_rest: 'Protect rest',
    reflect: 'Reflect',
  };
  return map[kind] ?? kind;
}

function kindColor(kind: string): string {
  const map: Record<string, string> = {
    schedule_task: 'bg-[#7c79ff]/10 text-[#7c79ff] border-[#7c79ff]/20',
    defer_task: 'bg-[#ffd93d]/10 text-[#ffd93d] border-[#ffd93d]/20',
    reduce_scope: 'bg-[#ff7b72]/10 text-[#ff7b72] border-[#ff7b72]/20',
    complete_habit: 'bg-[#39d353]/10 text-[#39d353] border-[#39d353]/20',
    preserve_rest: 'bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20',
    reflect: 'bg-[#8b949e]/10 text-[#8b949e] border-[#8b949e]/20',
  };
  return map[kind] ?? 'bg-[#8b949e]/10 text-[#8b949e] border-[#8b949e]/20';
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  const [open, setOpen] = useState(false);
  if (!evidence.length) return null;
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8b949e] hover:text-[#dae2fd] transition-colors"
      >
        <Info className="w-3 h-3" />
        Why? ({evidence.length})
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pl-2 border-l border-[#ffffff0a]">
          {evidence.map((e, i) => (
            <li key={i} className="text-[12px] text-[#8b949e] leading-relaxed">
              <span className="text-[#dae2fd]/60 font-semibold">{e.type.replace(/_/g, ' ')}: </span>
              {e.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProposedActionBadge({ action }: { action: ProposedAction }) {
  if (action.type === 'none' || !action.type) return null;

  if (action.type === 'create_calendar_block' && action.start && action.end) {
    return (
      <div className="mt-3 flex items-center gap-2 text-[12px] text-[#dae2fd]/70">
        <Clock className="w-3.5 h-3.5 text-[#7c79ff]" />
        <span>Proposed block: <strong className="text-[#dae2fd]">{formatTime(action.start)}</strong> – <strong className="text-[#dae2fd]">{formatTime(action.end)}</strong></span>
      </div>
    );
  }

  if (action.type === 'defer_task') {
    return (
      <div className="mt-3 flex items-center gap-2 text-[12px] text-[#ffd93d]/70">
        <CalendarDays className="w-3.5 h-3.5" />
        <span>Proposed action: <strong className="text-[#ffd93d]">Move to tomorrow</strong></span>
      </div>
    );
  }

  return null;
}

function RecommendationCard({
  rec,
  selected,
  onToggle,
}: {
  rec: Recommendation;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const conf = confidenceLabel(rec.confidence);

  return (
    <div
      className={`rounded-[16px] border p-5 transition-all cursor-pointer ${
        selected
          ? 'bg-[#7c79ff]/5 border-[#7c79ff]/40 shadow-[0_0_20px_rgba(124,121,255,0.08)]'
          : 'bg-[#0d1117] border-[#ffffff0a] hover:border-[#ffffff15]'
      }`}
      onClick={() => rec.requires_confirmation && onToggle(rec.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Selection checkbox */}
          {rec.requires_confirmation && (
            <div
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                selected
                  ? 'bg-[#7c79ff] border-[#7c79ff]'
                  : 'border-[#30363d] bg-transparent'
              }`}
            >
              {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${kindColor(rec.kind)}`}>
                {kindLabel(rec.kind)}
              </span>
              <span className={`text-[10px] font-semibold ${conf.color}`}>{conf.label}</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#dae2fd] leading-snug">{rec.title}</h3>
            <p className="mt-1 text-[12px] text-[#8b949e] leading-relaxed">{rec.reason}</p>
            <ProposedActionBadge action={rec.proposed_action} />
            <EvidencePanel evidence={rec.evidence} />
          </div>
        </div>
      </div>
      {rec.requires_confirmation && (
        <p className="mt-3 text-[10px] text-[#8b949e]/60 font-medium">
          Nothing changes until you confirm.
        </p>
      )}
    </div>
  );
}

function ModeButton({
  mode, current, icon: Icon, label, sub, onClick,
}: {
  mode: CoachMode; current: CoachMode; icon: React.ElementType;
  label: string; sub: string; onClick: () => void;
}) {
  const active = mode === current;
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-3 rounded-[14px] border transition-all ${
        active
          ? 'bg-[#7c79ff]/10 border-[#7c79ff]/30 text-[#7c79ff]'
          : 'bg-[#0d1117] border-[#ffffff0a] text-[#8b949e] hover:border-[#ffffff15] hover:text-[#dae2fd]'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      <span className="text-[10px] opacity-60">{sub}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Coach page
// ---------------------------------------------------------------------------

export default function Coach() {
  const [mode, setMode] = useState<CoachMode>('daily');
  const [response, setResponse] = useState<CoachResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generate = async () => {
    setLoading(true);
    setResponse(null);
    setSelected(new Set());
    try {
      const data = await api.request<CoachResponse>('/api/coach/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: mode,
          date: todayISO(),
          timezone: guessTimezone(),
        }),
      });
      setResponse(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Coach unavailable. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sends only the user-selected recommendations to the apply endpoint.
  // The backend re-validates every action before writing anything to the DB.
  const applySelected = async () => {
    if (!response || selected.size === 0) return;
    setApplying(true);
    try {
      const selectedRecs = response.recommendations.filter(r => selected.has(r.id));
      await api.request('/api/coach/apply', {
        method: 'POST',
        body: JSON.stringify({
          recommendation_ids: Array.from(selected),
          recommendations: selectedRecs,
          date: todayISO(),
        }),
      });
      toast.success(`${selected.size} recommendation${selected.size > 1 ? 's' : ''} applied.`);
      setSelected(new Set());
      // Refresh the plan
      generate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not apply changes.');
    } finally {
      setApplying(false);
    }
  };

  const confirmable = response?.recommendations.filter(
    r => r.requires_confirmation && selected.has(r.id)
  ) ?? [];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-[10px] bg-[#7c79ff]/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[#7c79ff]" />
          </div>
          <h1 className="text-[22px] font-black text-[#dae2fd] tracking-tight uppercase">Coach</h1>
        </div>
        <p className="text-[#8b949e] text-[13px] leading-relaxed">
          Uses your current commitments and recent patterns to help you choose a realistic next step —
          without changing anything until you approve it.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-3 mb-6">
        <ModeButton mode="daily" current={mode} icon={Zap} label="Today's Focus"
          sub="What to do now" onClick={() => { setMode('daily'); setResponse(null); }} />
        <ModeButton mode="recovery" current={mode} icon={AlertTriangle} label="Recovery"
          sub="When overloaded" onClick={() => { setMode('recovery'); setResponse(null); }} />
        <ModeButton mode="weekly" current={mode} icon={CalendarDays} label="Weekly Review"
          sub="Reflect & adjust" onClick={() => { setMode('weekly'); setResponse(null); }} />
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-[14px] bg-gradient-to-r from-[#8e8cf7] to-[#6d69f0] hover:from-[#7c79ff] hover:to-[#524eff] text-white font-black uppercase tracking-widest text-[12px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(124,121,255,0.15)] mb-8"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</>
          : <><Brain className="w-4 h-4" /> Get {mode === 'daily' ? "Today's Focus" : mode === 'recovery' ? 'Recovery Plan' : 'Weekly Review'}</>
        }
      </button>

      {/* Response */}
      {response && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Warnings — split overload from others */}
          {response.warnings.length > 0 && (() => {
            const overloadWarnings = response.warnings.filter(w =>
              w.toLowerCase().includes('overload') || w.toLowerCase().includes('recovery')
            );
            const otherWarnings = response.warnings.filter(w =>
              !overloadWarnings.includes(w)
            );
            return (
              <>
                {overloadWarnings.length > 0 && (
                  <div className="rounded-[14px] border border-[#ff7b72]/30 bg-[#ff7b72]/5 p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-[#ff7b72] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-bold text-[#ff7b72] mb-1">Overload detected</p>
                        {overloadWarnings.map((w, i) => (
                          <p key={i} className="text-[12px] text-[#ff7b72]/80 leading-relaxed">{w}</p>
                        ))}
                        {mode !== 'recovery' && (
                          <button
                            onClick={() => { setMode('recovery'); generate(); }}
                            className="mt-3 text-[11px] font-black uppercase tracking-widest text-[#ff7b72] border border-[#ff7b72]/30 px-3 py-1.5 rounded-[8px] hover:bg-[#ff7b72]/10 transition-colors"
                          >
                            Switch to Recovery Mode
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {otherWarnings.length > 0 && (
                  <div className="rounded-[12px] border border-[#ffd93d]/20 bg-[#ffd93d]/5 p-4 space-y-1">
                    {otherWarnings.map((w, i) => (
                      <p key={i} className="text-[12px] text-[#ffd93d] flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

          {/* Summary */}
          <div className="rounded-[16px] border border-[#ffffff0a] bg-[#0d1117] p-6">
            <p className="text-[15px] font-bold text-[#dae2fd] leading-snug mb-2">{response.summary.headline}</p>
            <p className="text-[13px] text-[#8b949e] leading-relaxed">{response.summary.detail}</p>
            <p className="mt-3 text-[10px] text-[#8b949e]/40 font-mono">
              Generated {new Date(response.generated_at).toLocaleTimeString()}
            </p>
          </div>

          {/* Weekly review — evidence-first, no apply */}
          {response.type === 'weekly' && response.recommendations.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#8b949e] mb-3">
                Weekly Insights
              </p>
              <div className="space-y-3">
                {response.recommendations.map(rec => (
                  <div key={rec.id} className="rounded-[16px] border border-[#ffffff0a] bg-[#0d1117] p-5">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${kindColor(rec.kind)}`}>
                      {kindLabel(rec.kind)}
                    </span>
                    <h3 className="mt-2 text-[14px] font-bold text-[#dae2fd]">{rec.title}</h3>
                    <p className="mt-1 text-[12px] text-[#8b949e] leading-relaxed">{rec.reason}</p>
                    <EvidencePanel evidence={rec.evidence} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations (daily / recovery) */}
          {response.type !== 'weekly' && response.recommendations.length > 0 ? (
            <>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#8b949e] mb-3">
                  Recommendations — select to apply
                </p>
                <div className="space-y-3">
                  {response.recommendations.map(rec => (
                    <RecommendationCard
                      key={rec.id}
                      rec={rec}
                      selected={selected.has(rec.id)}
                      onToggle={toggleSelect}
                    />
                  ))}
                </div>
              </div>

              {/* Apply bar */}
              {confirmable.length > 0 && (
                <div className="sticky bottom-6 rounded-[16px] border border-[#7c79ff]/30 bg-[#080b12]/95 backdrop-blur p-4 flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                  <div>
                    <p className="text-[12px] font-bold text-[#dae2fd]">
                      {confirmable.length} recommendation{confirmable.length > 1 ? 's' : ''} selected
                    </p>
                    <p className="text-[11px] text-[#8b949e]">Nothing changes until you confirm below.</p>
                  </div>
                  <button
                    onClick={applySelected}
                    disabled={applying}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#7c79ff] hover:bg-[#6d69f0] text-white text-[12px] font-black uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    {applying
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying...</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Apply</>
                    }
                  </button>
                </div>
              )}
            </>
          ) : response.type !== 'weekly' ? (
            <div className="rounded-[16px] border border-[#ffffff0a] bg-[#0d1117] p-8 text-center">
              <RefreshCw className="w-8 h-8 text-[#8b949e] mx-auto mb-3 opacity-40" />
              <p className="text-[13px] text-[#8b949e]">No actionable recommendations right now.</p>
              <p className="text-[11px] text-[#8b949e]/50 mt-1">Check back once you've added tasks or habits.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Empty state */}
      {!response && !loading && (
        <div className="rounded-[20px] border border-[#ffffff05] bg-[#0d1117] p-12 text-center">
          <Brain className="w-12 h-12 text-[#7c79ff]/30 mx-auto mb-4" />
          <p className="text-[14px] font-bold text-[#dae2fd]/50">
            {mode === 'daily' && "Get your Today's Focus"}
            {mode === 'recovery' && 'Get a Recovery Plan'}
            {mode === 'weekly' && 'Get your Weekly Review'}
          </p>
          <p className="text-[12px] text-[#8b949e]/50 mt-1">
            Coach will analyse your tasks, habits, and recent patterns.
          </p>
        </div>
      )}
    </div>
  );
}
