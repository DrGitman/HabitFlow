import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Check, Plus, X, Flame, Droplets, Brain, BookOpen, Dumbbell, Code2, Link2 } from 'lucide-react';

interface Habit {
  id: number;
  name: string;
  description?: string;
  category?: string;
  frequency: string;
  target_count: number;
  color?: string;
  icon?: string;
  created_at: string;
}

interface ProgressData {
  date: string;
  count: number;
}

// ── Week calendar data ────────────────────────────────────────────────────
const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

function getWeekDates() {
  const today = new Date();
  const dow   = today.getDay(); // 0=Sun
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.getDate();
  });
}

// ── Habit icon picker ─────────────────────────────────────────────────────
const ICON_MAP: { [k: string]: React.ElementType } = {
  water:     Droplets,
  hydration: Droplets,
  meditation:Brain,
  reading:   BookOpen,
  training:  Dumbbell,
  gym:       Dumbbell,
  code:      Code2,
  dev:       Code2,
};

function pickIcon(name: string): React.ElementType {
  const lower = name.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return Icon;
  }
  return Flame;
}

function pickColor(color?: string): string {
  return color || '#39d353';
}

// Build 35-cell heatmap (5 weeks × 7 days) from progress data
function buildHeatmapColors(progress: ProgressData[]): string[] {
  const LEVELS = ['#1a1a2e', '#0e4429', '#006d32', '#26a641', '#39d353'];
  // Build lookup by date string
  const lookup: Record<string, number> = {};
  for (const p of progress) {
    lookup[p.date] = p.count;
  }
  const today = new Date();
  const cells: string[] = [];
  // 35 days back from today
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const count = lookup[key] || 0;
    const level = count === 0 ? 0 : count === 1 ? 2 : count === 2 ? 3 : 4;
    cells.push(LEVELS[level]);
  }
  return cells;
}

// Habit Goal Link Dropdown (Multi-select)
function HabitGoalLinkDropdown({
  isOpen,
  habitId,
  linkedGoalIds,
  goals,
  onConfirm,
  onClose,
  buttonRef,
}: {
  isOpen: boolean;
  habitId: number | null;
  linkedGoalIds: number[];
  goals: Array<{ id: number; title: string }>;
  onConfirm: (goalIds: number[]) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}) {
  const [search, setSearch] = useState('');
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>(linkedGoalIds);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredGoals = search.trim()
    ? goals.filter(goal => goal.title.toLowerCase().includes(search.toLowerCase()))
    : [];

  // Recently linked goals (first 3)
  const recentGoals = goals.slice(0, 3);
  
  // Popular goals - for now same as recent
  const popularGoals = goals.slice(0, 3);

  useEffect(() => {
    setSelectedGoalIds(linkedGoalIds);
  }, [linkedGoalIds, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const toggleGoal = (goalId: number) => {
    setSelectedGoalIds(prev =>
      prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
    );
  };

  if (!isOpen || habitId === null) return null;

  const displaySearch = search.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div
        ref={dropdownRef}
        className="bg-[#171f33] border border-[#ffffff10] rounded-[16px] w-full max-w-[480px] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Search bar section */}
        <div className="p-4 border-b border-[#ffffff08] flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search goals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#222a3d] border border-[#ffffff08] rounded-[8px] text-[#dae2fd] placeholder-[#8b949e] text-[13px] px-4 py-2.5 focus:outline-none focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/30"
                autoFocus
              />
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-[#222a3d] rounded-[8px] text-[#8b949e] hover:text-[#c7c4d7] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="overflow-y-auto flex-1">
          {goals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-[#8b949e]">No goals available to link</p>
            </div>
          ) : displaySearch ? (
            <div className="p-4">
              {filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[13px] text-[#8b949e]">No goals found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredGoals.map(goal => (
                    <label
                      key={goal.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-[8px] bg-[#222a3d] border border-[#ffffff08] hover:border-[#ffffff15] cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGoalIds.includes(goal.id)}
                        onChange={() => toggleGoal(goal.id)}
                        className="w-4 h-4 rounded-[4px] accent-[#7c79ff] cursor-pointer"
                      />
                      <p className="text-[13px] font-semibold text-[#c7c4d7] truncate flex-1">{goal.title}</p>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Recently Linked */}
              {recentGoals.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-3 px-2">Recently Linked</p>
                  <div className="space-y-2">
                    {recentGoals.map(goal => (
                      <label
                        key={goal.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-[8px] bg-[#222a3d] border border-[#ffffff08] hover:border-[#ffffff15] cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGoalIds.includes(goal.id)}
                          onChange={() => toggleGoal(goal.id)}
                          className="w-4 h-4 rounded-[4px] accent-[#7c79ff] cursor-pointer"
                        />
                        <p className="text-[13px] font-semibold text-[#c7c4d7] truncate flex-1">{goal.title}</p>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Goals */}
              {popularGoals.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-3 px-2">Popular Goals</p>
                  <div className="space-y-2">
                    {popularGoals.map(goal => (
                      <label
                        key={goal.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-[8px] bg-[#222a3d] border border-[#ffffff08] hover:border-[#ffffff15] cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGoalIds.includes(goal.id)}
                          onChange={() => toggleGoal(goal.id)}
                          className="w-4 h-4 rounded-[4px] accent-[#7c79ff] cursor-pointer"
                        />
                        <p className="text-[13px] font-semibold text-[#c7c4d7] truncate flex-1">{goal.title}</p>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with action button */}
        <div className="p-4 border-t border-[#ffffff08] bg-[#0f1419] flex-shrink-0">
          <button
            onClick={() => {
              onConfirm(selectedGoalIds);
              onClose();
            }}
            className="w-full bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold px-4 py-2.5 rounded-[8px] transition-all text-[13px]"
          >
            Link {selectedGoalIds.length > 0 ? `(${selectedGoalIds.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Habits({ forceNew, onFormOpened }: { forceNew?: boolean; onFormOpened?: () => void }) {
  const [habits,  setHabits]  = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [goals, setGoals] = useState<Array<{ id: number; title: string }>>([]);
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [linkingHabitId, setLinkingHabitId] = useState<number | null>(null);
  const [linkedGoalIds, setLinkedGoalIds] = useState<number[]>([]);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', category: '', frequency: 'daily', target_count: 1, color: '#39d353',
  });

  const weekDates = getWeekDates();
  const todayDow  = (new Date().getDay() + 6) % 7; // 0=Mon

  useEffect(() => { fetchHabits(); }, []);

  // Handle forceNew from Quick Commit
  useEffect(() => {
    if (forceNew) {
      setShowForm(true);
      setEditingHabit(null);
      setFormData({ name: '', description: '', category: '', frequency: 'daily', target_count: 1, color: '#39d353' });
      onFormOpened?.();
    }
  }, [forceNew]);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const [h, s, p] = await Promise.all([
        api.getHabits(),
        api.getAnalyticsStreaks(),
        api.getAnalyticsProgress(),
      ]);
      setHabits(h as Habit[]);
      setStreaks(s as any[]);
      setProgress(p as ProgressData[]);

      // Fetch goals for linking
      try {
        const goalsData = await api.getGoals();
        const formattedGoals = (goalsData as any[]).map(g => ({ id: g.id, title: g.title }));
        setGoals(formattedGoals);
      } catch (e) {
        console.error('Error fetching goals:', e);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.completeHabit(id);
      setCompletedIds(prev => new Set([...prev, id]));
      fetchHabits();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this habit?')) {
      try { await api.deleteHabit(id); fetchHabits(); } catch (e) { console.error(e); }
    }
  };

  const handleEdit = (h: Habit) => {
    setEditingHabit(h);
    setFormData({ name: h.name, description: h.description||'', category: h.category||'', frequency: h.frequency, target_count: h.target_count, color: h.color||'#39d353' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHabit) await api.updateHabit(editingHabit.id, formData);
      else await api.createHabit(formData);
      setFormData({ name:'', description:'', category:'', frequency:'daily', target_count:1, color:'#39d353' });
      setShowForm(false); setEditingHabit(null); fetchHabits();
    } catch (e) { console.error(e); }
  };

  const handleLinkGoals = async (goalIds: number[]) => {
    if (linkingHabitId === null) return;
    try {
      // Link the habit to each selected goal
      for (const goalId of goalIds) {
        await api.linkHabitToGoal(goalId, linkingHabitId);
      }
      fetchHabits();
      setLinkDropdownOpen(false);
      setLinkingHabitId(null);
      setLinkedGoalIds([]);
    } catch (e) {
      console.error('Error linking goals:', e);
    }
  };

  const getStreak = (id: number) => streaks.find((s: any) => s.habit_id === id)?.current_streak || 0;

  const completed = habits.filter(h => completedIds.has(h.id)).length;
  const total     = habits.length;

  // Format target_count into readable string
  const fmtTarget = (h: Habit): string => {
    const units: Record<string, string> = { water: '3L', hydration: '3L', reading: '20 Pages', meditation: '15 Minutes', training: '45 Minutes', gym: '45 Minutes', dev: '1 Hour', code: '1 Hour' };
    const lower = h.name.toLowerCase();
    for (const [k, v] of Object.entries(units)) { if (lower.includes(k)) return v; }
    return `${h.target_count} ${h.target_count === 1 ? 'time' : 'times'}`;
  };

  // Compute real consistency from last 7 days of progress
  const last7 = progress.slice(-7);
  const activeDays = last7.filter(d => d.count > 0).length;
  const consistencyPct = last7.length > 0 ? Math.round((activeDays / last7.length) * 100) : 0;

  // Compute change vs previous 7 days
  const prev7 = progress.slice(-14, -7);
  const prevActiveDays = prev7.filter(d => d.count > 0).length;
  const prevPct = prev7.length > 0 ? Math.round((prevActiveDays / prev7.length) * 100) : 0;
  const pctChange = consistencyPct - prevPct;

  const heatmapColors = buildHeatmapColors(progress);

  const HABIT_COLORS = ['#39d353','#58a6ff','#f85149','#d29922','#bc8cff'];

  // Compute date range for heatmap label
  const todayLabel = 'TODAY';
  const startDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 34);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  })();

  return (
    <div className="p-8 animate-in fade-in duration-700 font-['Inter']">

      {/* ── Week calendar ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        {DAYS.map((day, i) => {
          const isToday = i === todayDow;
          return (
            <div
              key={day}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-[10px] transition-all ${
                isToday ? 'bg-[#7c79ff]' : 'bg-transparent'
              }`}
            >
              <span className={`text-[9px] font-black uppercase tracking-widest ${isToday ? 'text-white' : 'text-[#8b949e]'}`}>
                {day}
              </span>
              <span className={`text-[18px] font-black leading-none ${isToday ? 'text-white' : 'text-[#c7c4d7]'}`}>
                {weekDates[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Today's Protocol header ───────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#8b949e]">
          Today's Protocol
        </span>
        <span className="text-[12px] font-semibold text-[#8b949e]">
          {completed} of {total} Completed
        </span>
      </div>

      {/* ── Protocol list ─────────────────────────────── */}
      <div className="flex flex-col divide-y divide-[#ffffff06] border border-[#ffffff08] rounded-[14px] overflow-hidden mb-6">

        {habits.map((habit) => {
          const Icon      = pickIcon(habit.name);
          const color     = pickColor(habit.color);
          const streak    = getStreak(habit.id);
          const isDone    = completedIds.has(habit.id);
          const target    = fmtTarget(habit);

          return (
            <div
              key={habit.id}
              className="group flex items-center gap-4 px-5 py-4 bg-[#171f33] hover:bg-[#1c2540] transition-all relative"
            >
              {/* Colored icon bubble */}
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold ${isDone ? 'text-[#8b949e] line-through' : 'text-[#dae2fd]'}`}>
                  {habit.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {streak} days
                  </span>
                  <span className="text-[11px] text-[#8b949e]">{target}</span>
                </div>
              </div>

              {/* Edit/Delete actions */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                <button
                  ref={linkingHabitId === habit.id ? linkButtonRef : null}
                  onClick={() => {
                    setLinkingHabitId(habit.id);
                    setLinkedGoalIds([]); // Will be filled from API when needed
                    setLinkDropdownOpen(true);
                  }}
                  className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#7c79ff] transition-all"
                  title="Link to goals"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleEdit(habit)}
                  className="px-2 py-1 text-[11px] text-[#8b949e] hover:text-[#7c79ff] hover:bg-[#222a3d] rounded-[6px] transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  className="px-2 py-1 text-[11px] text-[#8b949e] hover:text-[#f85149] hover:bg-[#222a3d] rounded-[6px] transition-all"
                >
                  Delete
                </button>
              </div>

              {/* Complete button */}
              {isDone ? (
                <button className="w-9 h-9 rounded-full border-2 border-[#22c55e] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-[#22c55e]" />
                </button>
              ) : (
                <button
                  onClick={() => handleComplete(habit.id)}
                  className="w-9 h-9 rounded-full border border-[#ffffff20] flex items-center justify-center text-[#8b949e] hover:border-[#22c55e] hover:text-[#22c55e] transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {!loading && habits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-[#171f33]">
            <Flame className="w-10 h-10 text-[#ffffff15] mb-3" />
            <p className="text-[#8b949e] text-[13px]">No habits yet — start your protocol.</p>
          </div>
        )}

        {/* Add new habit row */}
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingHabit(null); }}
            className="flex items-center justify-center gap-2 py-4 bg-[#171f33] hover:bg-[#1c2540] text-[#8b949e] hover:text-[#c2c1ff] text-[13px] transition-all w-full border-t border-[#ffffff06]"
          >
            <Plus className="w-4 h-4" /> Add Habit
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-[#171f33] border border-[#ffffff0a] rounded-[12px] p-5 mb-6 animate-in zoom-in-95 duration-200">
          <h4 className="text-[15px] font-bold text-[#dae2fd] mb-4">{editingHabit ? 'Edit Habit' : 'New Habit'}</h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text" value={formData.name} placeholder="Habit name..."
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#22c55e] focus:outline-none text-[13px]"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={formData.frequency}
                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                className="bg-[#0d1117] text-[#dae2fd] px-3 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#22c55e] focus:outline-none text-[13px]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <input
                type="number" value={formData.target_count} min={1}
                onChange={e => setFormData({ ...formData, target_count: parseInt(e.target.value) })}
                className="bg-[#0d1117] text-[#dae2fd] px-3 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#22c55e] focus:outline-none text-[13px]"
                placeholder="Target/day"
              />
            </div>
            {/* Color picker */}
            <div className="flex gap-3 items-center">
              <span className="text-[11px] text-[#8b949e] uppercase tracking-widest font-bold">Color</span>
              <div className="flex gap-2">
                {HABIT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-7 h-7 rounded-full transition-all ${formData.color === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold px-6 py-2 rounded-[8px] text-[13px] transition-all active:scale-95">
                {editingHabit ? 'Save' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingHabit(null); }}
                className="bg-[#222a3d] hover:bg-[#2d3449] text-[#c7c4d7] font-bold px-6 py-2 rounded-[8px] text-[13px] transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Consistency Score heatmap ─────────────────── */}
      <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[13px] font-bold text-[#dae2fd]">Consistency Score</p>
            <p className="text-[11px] text-[#8b949e] mt-0.5">
              Visualizing the last 5 weeks of progress
            </p>
          </div>
          <div className="text-right">
            <p className="text-[20px] font-black text-[#dae2fd]">{consistencyPct}%</p>
            <p className={`text-[10px] font-black tracking-widest ${pctChange >= 0 ? 'text-[#22c55e]' : 'text-[#f85149]'}`}>
              {pctChange >= 0 ? '+' : ''}{pctChange}% FROM LAST WEEK
            </p>
          </div>
        </div>

        {/* Grid: 5 rows × 7 cols = 35 days */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {heatmapColors.map((color, i) => (
            <div
              key={i}
              className="rounded-[6px] transition-transform hover:scale-110"
              style={{ backgroundColor: color, aspectRatio: '1' }}
            />
          ))}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-3">
          <span className="text-[10px] text-[#8b949e]">{startDate}</span>
          <span className="text-[10px] text-[#8b949e]">{todayLabel}</span>
        </div>
      </div>

      {/* Habit Goal Link Dropdown */}
      <HabitGoalLinkDropdown
        isOpen={linkDropdownOpen}
        habitId={linkingHabitId}
        linkedGoalIds={linkedGoalIds}
        goals={goals}
        onConfirm={handleLinkGoals}
        onClose={() => {
          setLinkDropdownOpen(false);
          setLinkingHabitId(null);
          setLinkedGoalIds([]);
        }}
        buttonRef={linkButtonRef}
      />
    </div>
  );
}
