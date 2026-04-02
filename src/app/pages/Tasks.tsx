import { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Check, Plus, Clock, CheckCircle2, Trash2, Edit2, Tag,
} from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  is_completed: boolean;
  created_at: string;
}

// ── Priority badge meta matching reference image ──────────────────────────
const PRIORITY_META = {
  high:   { label: 'HIGH PRIORITY', bg: '#1e3a5f', text: '#60a5fa' },
  medium: { label: 'WORK',          bg: '#1a2a1a', text: '#4ade80' },
  low:    { label: 'PERSONAL',      bg: '#2d1a3d', text: '#c084fc' },
};

// Pomodoro timer display
function FocusMode() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

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
      <div className="px-5 pb-5">
        <button
          onClick={() => setRunning(r => !r)}
          className="w-full bg-[#222a3d] hover:bg-[#2d3449] text-[#c7c4d7] text-[13px] font-bold py-2.5 rounded-[8px] transition-all"
        >
          {running ? 'Pause Session' : 'Start Session'}
        </button>
      </div>
    </div>
  );
}

// Mini heatmap (7×2 grid)
function MiniHeatmap() {
  const cells = Array.from({ length: 14 }, (_, i) => {
    const v = Math.random();
    if (v < 0.1) return '#6b2737'; // missed
    if (v < 0.25) return '#1f3a2a';
    if (v < 0.5)  return '#27ae60';
    return '#2ecc71';
  });
  return (
    <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#8b949e]">Consistency</p>
        <span className="text-[13px] font-black text-[#22c55e]">84%</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((color, i) => (
          <div key={i} className="h-5 rounded-[4px]" style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

// Upcoming panel
const UPCOMING = [
  { when: 'Tomorrow, 10:00 AM', label: 'Client Review Meeting' },
  { when: 'Wed, Jun 14',        label: 'Renew Software Licenses' },
];

type Filter = 'all' | 'work' | 'personal';

export default function Tasks() {
  const [tasks,       setTasks]       = useState<Task[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<Filter>('all');
  const [showForm,    setShowForm]    = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData,    setFormData]    = useState({
    title: '', description: '', category: '', priority: 'medium' as Task['priority'], due_date: '',
  });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data as Task[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleComplete = async (id: number, done: boolean) => {
    try { await api.completeTask(id, !done); fetchTasks(); } catch (e) { console.error(e); }
  };
  const handleDelete = async (id: number) => {
    if (confirm('Delete this task?')) { try { await api.deleteTask(id); fetchTasks(); } catch (e) { console.error(e); } }
  };
  const handleEdit = (t: Task) => {
    setEditingTask(t);
    setFormData({ title: t.title, description: t.description || '', category: t.category || '', priority: t.priority, due_date: t.due_date || '' });
    setShowForm(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) await api.updateTask(editingTask.id, formData);
      else await api.createTask(formData);
      setFormData({ title: '', description: '', category: '', priority: 'medium', due_date: '' });
      setShowForm(false); setEditingTask(null); fetchTasks();
    } catch (e) { console.error(e); }
  };

  // Map priority → filter bucket
  const filterBucket = (t: Task): Filter => {
    if (t.priority === 'high') return 'work';
    if (t.priority === 'low') return 'personal';
    return 'all';
  };

  const visible = tasks.filter(t => filter === 'all' || filterBucket(t) === filter);
  const pending   = visible.filter(t => !t.is_completed);
  const completed = visible.filter(t => t.is_completed);

  // Format time from due_date or created_at
  const fmtTime = (iso?: string) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return null; }
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
          {(['all', 'work', 'personal'] as Filter[]).map(f => (
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
            const t   = fmtTime(task.due_date || task.created_at);
            return (
              <div
                key={task.id}
                className="group bg-[#171f33] border border-[#ffffff08] hover:border-[#ffffff15] rounded-[12px] px-5 py-4 flex items-center gap-4 transition-all"
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
                  Completed {fmtTime(task.created_at)}
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
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                    className="col-span-1 bg-[#0d1117] text-[#dae2fd] px-3 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none text-[13px]"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Work</option>
                    <option value="low">Personal</option>
                  </select>
                  <input
                    type="text" value={formData.category} placeholder="Category"
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="col-span-1 bg-[#0d1117] text-[#dae2fd] px-3 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none text-[13px]"
                  />
                  <input
                    type="date" value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="col-span-1 bg-[#0d1117] text-[#dae2fd] px-3 py-2.5 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none text-[13px]"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" className="bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold px-6 py-2 rounded-[8px] text-[13px] transition-all active:scale-95">
                    {editingTask ? 'Save' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingTask(null); }}
                    className="bg-[#222a3d] hover:bg-[#2d3449] text-[#c7c4d7] font-bold px-6 py-2 rounded-[8px] text-[13px] transition-all">
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
          <FocusMode />

          {/* Upcoming */}
          <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] mb-4">Upcoming</p>
            <div className="flex flex-col gap-3">
              {UPCOMING.map(u => (
                <div key={u.label} className="flex gap-3">
                  <div className="w-[3px] rounded-full bg-[#7c79ff] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-[#8b949e]">{u.when}</p>
                    <p className="text-[13px] font-semibold text-[#c7c4d7]">{u.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini consistency heatmap */}
          <MiniHeatmap />
        </div>
      </div>
    </div>
  );
}
