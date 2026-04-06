import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import {
  Check, Plus, Clock, CheckCircle2, Trash2, Edit2, Tag, Calendar as CalendarIcon, Link2, X,
} from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
   scheduled_date?: string;
   scheduled_time?: string;
  goal_id?: number | null;
  is_completed: boolean;
  created_at: string;
}

interface HabitCompletion {
  completion_date: string;
  count: number;
}

// ── Priority badge meta matching reference image ──────────────────────────
const PRIORITY_META = {
  high:   { label: 'High', bg: '#1e3a5f', text: '#60a5fa' },
  medium: { label: 'Medium', bg: '#2d2a1a', text: '#f59e0b' },
  low:    { label: 'Low', bg: '#2d1a3d', text: '#c084fc' },
};

const CATEGORY_OPTIONS = ['School', 'Personal', 'Work'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;
type Filter = 'all' | 'work' | 'personal' | 'school';

// Pomodoro timer display - now task-linked
function FocusMode({ onSessionStart }: { onSessionStart: (taskId: number) => void }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data as Task[]);
      setIncompleteTasks((data as Task[]).filter(t => !t.is_completed));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartSession = async () => {
    if (!selectedTaskId) {
      toast.warning('Please select a task first');
      return;
    }
    setRunning(true);
    onSessionStart(selectedTaskId);
  };

  const handleTimerEnd = async () => {
    if (running && seconds === 0) {
      setRunning(false);
      toast.info('Did you complete this task?', {
        action: {
          label: 'Yes, complete',
          onClick: async () => {
            try {
              await api.completeTask(selectedTaskId!, true);
              fetchTasks();
            } catch (e) {
              console.error(e);
            }
          }
        },
        cancel: {
          label: 'No',
          onClick: () => {}
        },
        duration: 10000,
      });
      setSeconds(25 * 60);
      setSelectedTaskId(null);
    }
  };

  useEffect(() => {
    handleTimerEnd();
  }, [seconds, running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#c7c4d7]">Focus Mode</p>
      </div>
      {/* Pomodoro display */}
      <div
        className="mx-5 my-3 rounded-[10px] flex flex-col items-center justify-center py-8 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 60%, #1a3040 0%, #0d1117 80%)' }}
      >
        {/* Glow circle */}
        <div className="absolute w-32 h-32 rounded-full bg-[#22c55e]/10 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <span className="text-[42px] font-black text-white tracking-tight leading-none relative z-10">
          {mm}:{ss}
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e] mt-1 relative z-10">
          {running ? 'POMODORO ACTIVE' : 'READY'}
        </span>
      </div>
      {/* Task selector dropdown */}
      <div className="px-5">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] block mb-2">
          SELECT TASK
        </label>
        <select
          value={selectedTaskId || ''}
          onChange={(e) => setSelectedTaskId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full appearance-none bg-[#0d1117] text-[#c7c4d7] px-3 py-2.5 rounded-[8px] border border-[#30363d] focus:border-[#7c79ff] focus:outline-none text-[12px] cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2712%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%238b949e%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center]"
        >
          <option value="">Choose a task...</option>
          {incompleteTasks.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>
      <div className="px-5 pb-5 pt-4">
        <button
          onClick={handleStartSession}
          disabled={!selectedTaskId}
          className="w-full bg-[#222a3d] hover:bg-[#2d3449] disabled:opacity-50 disabled:cursor-not-allowed text-[#c7c4d7] text-[13px] font-bold py-2.5 rounded-[8px] transition-all"
        >
          {running ? 'Session Active...' : 'Start Session'}
        </button>
      </div>
    </div>
  );
}

// Mini heatmap - now dynamic from database
function MiniHeatmap({ completions }: { completions: HabitCompletion[] }) {
  // Create a map of completion dates
  const completionMap = new Map(
    completions.map(c => [c.completion_date, c.count])
  );

  // Get last 14 days
  const cells = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toLocaleDateString('sv-SE');
    const count = completionMap.get(dateStr) || 0;
    
    if (count === 0) return '#6b2737';
    if (count === 1) return '#1f3a2a';
    if (count === 2) return '#27ae60';
    return '#2ecc71';
  });

  const totalDays = 14;
  const completedDays = Array.from(completionMap.values()).filter(c => c > 0).length;
  const consistency = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#8b949e]">Consistency</p>
        <span className="text-[13px] font-black text-[#22c55e]">{consistency}%</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((color, i) => (
          <div key={i} className="h-5 rounded-[4px]" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

// Upcoming panel - now fetched from DB
function UpcomingTasks({ tasks }: { tasks: Task[] }) {
  const upcomingTasks = tasks
    .filter(t => (t.scheduled_date || t.due_date) && !t.is_completed)
    .sort((a, b) => {
      const aDate = a.scheduled_date || a.due_date;
      const bDate = b.scheduled_date || b.due_date;
      if (!aDate || !bDate) return 0;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    })
    .slice(0, 5);

  const formatScheduledTime = (timeStr?: string) => {
    if (!timeStr) return null;
    const normalized = String(timeStr).slice(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] mb-4">Upcoming</p>
      <div className="flex flex-col gap-3">
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map(task => (
            <div key={task.id} className="flex gap-3">
              <div className="w-[3px] rounded-full bg-[#7c79ff] shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-[#8b949e]">{(task.scheduled_date || task.due_date) ? formatDueDate(task.scheduled_date || task.due_date || '') : 'No date'}</p>
                <p className="text-[13px] font-semibold text-[#c7c4d7]">{task.title}</p>
                {task.scheduled_time && <p className="text-[11px] text-[#8b949e] mt-0.5">{formatScheduledTime(task.scheduled_time)}</p>}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-[#8b949e]">No upcoming tasks</p>
        )}
      </div>
    </div>
  );
}

interface TasksProps {
  forceNew?: boolean;
  onFormOpened?: () => void;
}

// Goal Link Dropdown Component
function GoalLinkDropdown({
  isOpen,
  taskId,
  currentGoalId,
  goals,
  onSelect,
  onClose,
  buttonRef,
}: {
  isOpen: boolean;
  taskId: number | null;
  currentGoalId?: number | null;
  goals: Array<{ id: number; title: string }>;
  onSelect: (goalId: number | null) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}) {
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredGoals = search.trim() 
    ? goals.filter(goal => goal.title.toLowerCase().includes(search.toLowerCase()))
    : [];

  // Recently linked goals (first 3)
  const recentGoals = goals.slice(0, 3);
  
  // Popular goals (most linked) - for now same as recent
  const popularGoals = goals.slice(0, 3);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || taskId === null) return null;

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
          {displaySearch ? (
            <div className="p-4">
              {filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[13px] text-[#8b949e]">No goals found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredGoals.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => {
                        onSelect(goal.id);
                        onClose();
                      }}
                      className={`w-full text-left px-4 py-3 rounded-[8px] border transition-all hover:bg-[#222a3d] ${
                        currentGoalId === goal.id
                          ? 'bg-[#7c79ff]/20 border-[#7c79ff]'
                          : 'bg-[#222a3d] border-[#ffffff08] hover:border-[#ffffff15]'
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-[#c7c4d7]">{goal.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* None option */}
              <div>
                <button
                  onClick={() => {
                    onSelect(null);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-[8px] border transition-all ${
                    currentGoalId === null
                      ? 'bg-[#7c79ff]/20 border-[#7c79ff]'
                      : 'bg-[#222a3d] border-[#ffffff08] hover:border-[#ffffff15] hover:bg-[#222a3d]'
                  }`}
                >
                  <p className="text-[13px] font-semibold text-[#c7c4d7]">None (Unlink)</p>
                </button>
              </div>

              {/* Recently Linked */}
              {recentGoals.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#8b949e] uppercase tracking-widest mb-3 px-2">Recently Linked</p>
                  <div className="space-y-2">
                    {recentGoals.map(goal => (
                      <button
                        key={goal.id}
                        onClick={() => {
                          onSelect(goal.id);
                          onClose();
                        }}
                        className={`w-full text-left px-4 py-3 rounded-[8px] border transition-all ${
                          currentGoalId === goal.id
                            ? 'bg-[#7c79ff]/20 border-[#7c79ff]'
                            : 'bg-[#222a3d] border-[#ffffff08] hover:border-[#ffffff15] hover:bg-[#222a3d]'
                        }`}
                      >
                        <p className="text-[13px] font-semibold text-[#c7c4d7]">{goal.title}</p>
                      </button>
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
                      <button
                        key={goal.id}
                        onClick={() => {
                          onSelect(goal.id);
                          onClose();
                        }}
                        className={`w-full text-left px-4 py-3 rounded-[8px] border transition-all ${
                          currentGoalId === goal.id
                            ? 'bg-[#7c79ff]/20 border-[#7c79ff]'
                            : 'bg-[#222a3d] border-[#ffffff08] hover:border-[#ffffff15] hover:bg-[#222a3d]'
                        }`}
                      >
                        <p className="text-[13px] font-semibold text-[#c7c4d7]">{goal.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TasksProps {
  forceNew?: boolean;
  onFormOpened?: () => void;
  highlightId?: number | null;
  onHighlightReset?: () => void;
}

export default function Tasks({ forceNew, onFormOpened, highlightId, onHighlightReset }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const highlightedRef = useRef<HTMLDivElement>(null);

  // New: Handle highlighting and scrolling
  useEffect(() => {
    if (highlightId && !loading && tasks.length > 0) {
      const element = document.getElementById(`task-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-reset highlight after 3 seconds
        const timer = setTimeout(() => {
          onHighlightReset?.();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, loading, tasks]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'Personal',
    due_date: new Date().toISOString().split('T')[0],
  });
  const [goals, setGoals] = useState<Array<{ id: number; title: string }>>([]);
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [linkingTaskId, setLinkingTaskId] = useState<number | null>(null);
  const [currentTaskGoalId, setCurrentTaskGoalId] = useState<number | null>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data as Task[]);
      // Fetch consistency data from a mock source (in real app, would fetch from backend)
      // For now, we'll simulate based on tasks created
      const completionData = (data as Task[])
        .filter(t => t.is_completed && t.created_at)
        .map(t => ({
          completion_date: new Date(t.created_at).toISOString().split('T')[0],
          count: 1,
        }));
      setHabitCompletions(completionData);

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

  useEffect(() => { fetchTasks(); }, []);

  // Handle forceNew from Quick Commit
  useEffect(() => {
    if (forceNew) {
      setShowForm(true);
      setEditingTask(null);
      setFormData({ title: '', description: '', category: 'Personal', priority: 'medium', due_date: '' });
      onFormOpened?.();
    }
  }, [forceNew]);

  const handleComplete = async (id: number, done: boolean) => {
    try { 
      const date = new Date().toLocaleDateString('sv-SE');
      await api.completeTask(id, !done, date); 
      fetchTasks(); 
    } catch (e) { console.error(e); }
  };
  const handleDelete = async (id: number) => {
    toast.warning('Delete this task?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try { await api.deleteTask(id); fetchTasks(); } catch (e) { console.error(e); }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} },
      duration: 8000,
    });
  };
  const handleEdit = (t: Task) => {
    setEditingTask(t);
    setFormData({ title: t.title, description: t.description || '', category: t.category || 'Personal', priority: t.priority, due_date: t.due_date || '' });
    setShowForm(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Future Only Validation
    if (formData.due_date) {
      const selected = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        toast.error('Deadline cannot be in the past.');
        return;
      }
    }

    try {
      if (editingTask) await api.updateTask(editingTask.id, formData);
      else await api.createTask(formData);
      setFormData({ title: '', description: '', category: 'Personal', priority: 'medium', due_date: '' });
      setShowForm(false); setEditingTask(null); fetchTasks();
    } catch (e) { console.error(e); }
  };

  const handleLinkGoal = async (goalId: number | null) => {
    if (linkingTaskId === null) return;
    try {
      await api.updateTask(linkingTaskId, { goal_id: goalId });
      fetchTasks();
      setLinkDropdownOpen(false);
      setLinkingTaskId(null);
      setCurrentTaskGoalId(null);
    } catch (e) {
      console.error('Error linking goal:', e);
    }
  };

  // Map category → filter bucket
  const filterBucket = (t: Task): Filter => {
    const cat = (t.category || '').toLowerCase();
    if (cat === 'work') return 'work';
    if (cat === 'school') return 'school';
    if (cat === 'personal') return 'personal';
    return 'all';
  };

  const visible = tasks.filter(t => filter === 'all' || filterBucket(t) === filter);
  const pending   = visible.filter(t => !t.is_completed);
  const completed = visible.filter(t => t.is_completed);

  const fmtScheduledTime = (timeStr?: string) => {
    if (!timeStr) return null;
    const normalized = String(timeStr).slice(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
  };

  const fmtCompletedTime = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  const handleSessionStart = (taskId: number) => {
    console.log('Session started for task:', taskId);
  };

  return (
    <div className="p-8 animate-in fade-in duration-700 font-['Inter']">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[28px] font-black text-[#dae2fd] tracking-tight">My Tasks</h2>
          <p className="text-[#8b949e] text-[13px] mt-0.5">
            Review and execute your <span className="text-[#c7c4d7] italic">daily</span> objectives.
          </p>
        </div>
        {/* Filter tabs */}
        <div className="flex bg-[#171f33] border border-[#ffffff08] rounded-[10px] p-1 gap-1">
          {(['all', 'work', 'personal', 'school'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-[7px] text-[12px] font-bold capitalize transition-all ${
                filter === f ? 'bg-[#7c79ff] text-white' : 'text-[#8b949e] hover:text-[#c7c4d7]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two columns ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">

        {/* LEFT — task list */}
        <div className="flex flex-col gap-2">
          {/* Pending tasks */}
          {pending.map(task => {
            const pm  = PRIORITY_META[task.priority];
            const t   = fmtScheduledTime(task.scheduled_time);
            return (
              <div
                key={task.id}
                id={`task-${task.id}`}
                className={`group bg-[#171f33] border border-[#ffffff08] hover:border-[#ffffff15] rounded-[12px] px-5 py-4 flex items-center gap-4 transition-all ${
                  highlightId === task.id ? 'ring-2 ring-[#7c79ff] shadow-[0_0_20px_rgba(124,121,255,0.3)] bg-[#1c2540]' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleComplete(task.id, task.is_completed)}
                  className="w-5 h-5 rounded-[5px] border-2 border-[#ffffff20] flex items-center justify-center shrink-0 hover:border-[#7c79ff] transition-colors"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#dae2fd] truncate">{task.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[4px]"
                      style={{ backgroundColor: pm.bg, color: pm.text }}
                    >
                      {pm.label}
                    </span>
                    {t && (
                      <span className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                        <Clock className="w-3 h-3" /> {t}
                      </span>
                    )}
                    {task.category && (
                      <span className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                        <Tag className="w-3 h-3" /> {task.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    ref={linkingTaskId === task.id ? linkButtonRef : null}
                    onClick={() => {
                      setLinkingTaskId(task.id);
                      setCurrentTaskGoalId(task.goal_id || null);
                      setLinkDropdownOpen(true);
                    }}
                    className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#7c79ff] transition-all"
                    title="Link to goal"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleEdit(task)} className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#7c79ff] transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#f85149] transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Completed tasks */}
          {completed.map(task => (
            <div
              key={task.id}
              className="group bg-[#0f1520] border border-[#ffffff05] rounded-[12px] px-5 py-4 flex items-center gap-4 opacity-60 hover:opacity-80 transition-all"
            >
              <button
                onClick={() => handleComplete(task.id, task.is_completed)}
                className="w-5 h-5 rounded-[5px] bg-[#7c79ff] flex items-center justify-center shrink-0"
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#8b949e] line-through truncate">{task.title}</p>
                <p className="text-[11px] text-[#8b949e]/60 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                  Completed {fmtCompletedTime(task.created_at)}
                </p>
              </div>
              <button onClick={() => handleDelete(task.id)} className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#f85149] opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Empty state */}
          {!loading && pending.length === 0 && completed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#ffffff10] rounded-[12px]">
              <CheckCircle2 className="w-10 h-10 text-[#ffffff15] mb-3" />
              <p className="text-[#8b949e] text-[13px]">All clear — no tasks yet.</p>
            </div>
          )}

          {/* Add new task */}
          {!showForm ? (
            <button
              onClick={() => { setShowForm(true); setEditingTask(null); }}
              className="mt-2 w-full border border-dashed border-[#ffffff15] hover:border-[#7c79ff]/40 rounded-[12px] py-3.5 flex items-center justify-center gap-2 text-[13px] text-[#8b949e] hover:text-[#c2c1ff] transition-all"
            >
              <Plus className="w-4 h-4" /> Add New Task
            </button>
          ) : (
            <div className="mt-2 bg-[#171f33] border border-[#ffffff0a] rounded-[12px] p-5 animate-in zoom-in-95 duration-200">
              <h4 className="text-[15px] font-bold text-[#dae2fd] mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text" value={formData.title} placeholder="Task title..."
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none text-[13px] transition-all"
                  required
                />
                {/* Priority, Category, Date in a grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Priority Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e] block mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                      className="w-full appearance-none bg-[#0d1117] text-[#c7c4d7] px-3 py-2.5 rounded-[8px] border border-[#30363d] hover:border-[#7c79ff] focus:border-[#7c79ff] focus:outline-none text-[12px] cursor-pointer transition-all pr-8"
                      style={{
                        backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%238b949e%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '12px',
                      }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Category Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e] block mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full appearance-none bg-[#0d1117] text-[#c7c4d7] px-3 py-2.5 rounded-[8px] border border-[#30363d] hover:border-[#7c79ff] focus:border-[#7c79ff] focus:outline-none text-[12px] cursor-pointer transition-all pr-8"
                      style={{
                        backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%238b949e%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '12px',
                      }}
                    >
                      {CATEGORY_OPTIONS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Picker */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8b949e] block mb-1">Due Date</label>
                    <input
                      type="date" value={formData.due_date}
                      min={new Date().toLocaleDateString('sv-SE')}
                      onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full bg-[#0d1117] text-[#dae2fd] px-3 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none text-[12px] transition-all"
                      style={{
                        colorScheme: 'dark',
                      }}
                    />
                    <style>{`
                      input[type="date"]::-webkit-calendar-picker-indicator {
                        filter: brightness(0) invert(1) brightness(1.2);
                        cursor: pointer;
                        opacity: 0.9;
                      }
                      input[type="date"]::-webkit-calendar-picker-indicator:hover {
                        filter: brightness(0) invert(1) brightness(1.5);
                        opacity: 1;
                      }
                      input[type="date"] {
                        accent-color: #7c79ff;
                      }
                    `}</style>
                  </div>
                </div>

                {/* Description */}
                <textarea
                  value={formData.description}
                  placeholder="Add description (optional)..."
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none text-[13px] transition-all resize-none h-20"
                />

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold px-6 py-2.5 rounded-[8px] text-[13px] transition-all active:scale-95">
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingTask(null); }}
                    className="bg-[#222a3d] hover:bg-[#2d3449] text-[#c7c4d7] font-bold px-6 py-2.5 rounded-[8px] text-[13px] transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div className="flex flex-col gap-4">
          {/* Focus Mode / Pomodoro */}
          <FocusMode onSessionStart={handleSessionStart} />

          {/* Upcoming */}
          <UpcomingTasks tasks={tasks} />

        </div>
      </div>

      {/* Goal Link Dropdown */}
      <GoalLinkDropdown
        isOpen={linkDropdownOpen}
        taskId={linkingTaskId}
        currentGoalId={currentTaskGoalId}
        goals={goals}
        onSelect={handleLinkGoal}
        onClose={() => {
          setLinkDropdownOpen(false);
          setLinkingTaskId(null);
          setCurrentTaskGoalId(null);
        }}
        buttonRef={linkButtonRef}
      />
    </div>
  );
}

