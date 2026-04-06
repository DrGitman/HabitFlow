import { useState, useEffect } from 'react';
import { Trophy, Plus, Clock, AlertTriangle, CheckCircle, TrendingUp, Edit2, Trash2, Link2 } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

interface Goal {
  id: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  deadline?: string;
  is_completed: boolean;
  completed_at?: string;
}

const SAMPLE_GOALS: Goal[] = [
  {
    id: 1,
    title: 'Complete Certification: Cloud Architecture',
    description: 'Get AWS certified',
    priority: 'high',
    deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    is_completed: false,
  },
];

const priorityStyles: Record<string, { bg: string; text: string }> = {
  'HIGH PRIORITY': { bg: '#1d4ed820', text: '#60a5fa' },
  PERSONAL: { bg: '#7e22ce20', text: '#c084fc' },
  CRITICAL: { bg: '#d9770620', text: '#fb923c' },
  SUCCESS: { bg: '#16a34a20', text: '#4ade80' },
};

interface GoalsProps {
  forceNew?: boolean;
  onFormOpened?: () => void;
  highlightId?: number | null;
  onHighlightReset?: () => void;
}

export default function Goals({ forceNew, onFormOpened, highlightId, onHighlightReset }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [prevMonthProgress, setPrevMonthProgress] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goalProgress, setGoalProgress] = useState<Record<number, { completed: number; total: number }>>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    deadline: '',
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      calculateProgress(goals, tasks, habits);
      // Check if any goals should be auto-completed or reverted
      checkAndAutoCompleteGoals(goals, tasks, habits);
      checkAndRevertGoals(goals, tasks, habits);
    }
  }, [goals, tasks, habits]);

  const calculateProgress = (goalList: Goal[], taskList: any[], habitList: any[]) => {
    const progress: Record<number, { completed: number; total: number }> = {};
    for (const goal of goalList) {
      const linkedTasks = taskList.filter(t => t.goal_id === goal.id);
      const linkedHabits = habitList.filter(h => h.goal_ids?.includes(goal.id));
      
      const completedTasks = linkedTasks.filter(t => t.is_completed).length;
      const habitsDoneToday = linkedHabits.filter(h => h.is_completed_today).length;
      
      progress[goal.id] = { 
        completed: completedTasks + habitsDoneToday, 
        total: linkedTasks.length + linkedHabits.length 
      };
    }
    setGoalProgress(progress);
  };

  // Handle forceNew from Quick Commit
  useEffect(() => {
    if (forceNew) {
      setShowForm(true);
      setFormData({ title: '', description: '', priority: 'medium', deadline: '' });
      onFormOpened?.();
    }
  }, [forceNew]);

  // New: Handle highlighting and scrolling
  useEffect(() => {
    if (highlightId && !loading && goals.length > 0) {
      const element = document.getElementById(`goal-${highlightId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Auto-reset highlight after 3 seconds
        const timer = setTimeout(() => {
          onHighlightReset?.();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightId, loading, goals]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await api.getGoals();
      setGoals(data as Goal[]);
      calculatePrevMonthProgress(data as any[]);
      const [allTasks, allHabits] = await Promise.all([
        api.getTasks(),
        api.getHabits()
      ]);
      setTasks(allTasks as any[]);
      setHabits(allHabits as any[]);
      
      calculateProgress(data as Goal[], allTasks as any[], allHabits as any[]);
    } catch (e) { 
      console.error('Error fetching goals:', e); 
      setGoals([]);
    }
    finally { setLoading(false); }
  };

  const calculatePrevMonthProgress = (goalList: any[]) => {
    // For simplified goals, just track goal count
    setPrevMonthProgress(goalList.length);
  };

  const handleDelete = async (id: number) => {
    toast.warning('Delete this goal?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await api.deleteGoal(id);
            fetchGoals();
          } catch (e) {
            console.error('Error deleting goal:', e);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} },
      duration: 8000,
    });
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      priority: goal.priority || 'medium',
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate deadline is at least 1 day in the future
    if (formData.deadline) {
      // Parse the date string (YYYY-MM-DD format from input)
      const [year, month, day] = formData.deadline.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Compare just the dates without timezone issues
      if (selectedDate <= today) {
        toast.error('Deadline must be at least 1 day in the future');
        return;
      }
    }
    
    try {
      if (editingGoal) {
        await api.updateGoal(editingGoal.id, formData);
      } else {
        await api.createGoal(formData);
      }
      fetchGoals();
      setShowForm(false);
      setEditingGoal(null);
      setFormData({ title: '', description: '', priority: 'medium', deadline: '' });
    } catch (e) {
      console.error('Error saving goal:', e);
    }
  };

  const calculateMetrics = () => {
    const activeGoals = goals.filter(g => !g.is_completed);
    const completedGoals = goals.filter(g => g.is_completed);
    
    // Count goals on track (deadline is in the future)
    const onTrackCount = activeGoals.filter(g => {
      if (!g.deadline) return true; // Goals without deadline considered on track
      const daysLeft = Math.ceil((new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft > 0;
    }).length;

    return { onTrackCount, activeGoals, completedGoals };
  };

  // Auto-complete goals when all linked units are completed
  const checkAndAutoCompleteGoals = async (goalsToCheck: Goal[], tasksToCheck: any[], habitsToCheck: any[]) => {
    const goalsToComplete: number[] = [];
    
    for (const goal of goalsToCheck) {
      if (!goal.is_completed) {
        const linkedTasks = tasksToCheck.filter(t => t.goal_id === goal.id);
        const linkedHabits = habitsToCheck.filter(h => h.goal_ids?.includes(goal.id));
        
        const totalItems = linkedTasks.length + linkedHabits.length;
        if (totalItems > 0) {
          const allTasksDone = linkedTasks.length === 0 || linkedTasks.every(t => t.is_completed);
          const allHabitsDoneToday = linkedHabits.length === 0 || linkedHabits.every(h => h.is_completed_today);
          
          if (allTasksDone && allHabitsDoneToday) {
            goalsToComplete.push(goal.id);
          }
        }
      }
    }

    // Update completed goals
    for (const goalId of goalsToComplete) {
      try {
        await api.updateGoal(goalId, { is_completed: true });
      } catch (e) {
        console.error('Error completing goal:', e);
      }
    }

    // Refresh goals if any were completed
    if (goalsToComplete.length > 0) {
      fetchGoals();
    }
  };

  // Revert completed goals back to active if any linked unit becomes uncompleted
  const checkAndRevertGoals = async (goalsToCheck: Goal[], tasksToCheck: any[], habitsToCheck: any[]) => {
    const goalsToRevert: number[] = [];
    
    for (const goal of goalsToCheck) {
      if (goal.is_completed) {
        const linkedTasks = tasksToCheck.filter(t => t.goal_id === goal.id);
        const linkedHabits = habitsToCheck.filter(h => h.goal_ids?.includes(goal.id));
        
        const anyTaskUncompleted = linkedTasks.some(t => !t.is_completed);
        const anyHabitUncompletedToday = linkedHabits.some(h => !h.is_completed_today);
        
        if (anyTaskUncompleted || anyHabitUncompletedToday) {
          goalsToRevert.push(goal.id);
        }
      }
    }

    // Update reverted goals
    for (const goalId of goalsToRevert) {
      try {
        await api.updateGoal(goalId, { is_completed: false });
      } catch (e) {
        console.error('Error reverting goal:', e);
      }
    }

    // Refresh goals if any were reverted
    if (goalsToRevert.length > 0) {
      fetchGoals();
    }
  };

  const metrics = calculateMetrics();
  const completionRate = metrics.activeGoals.length > 0 
    ? Math.round((metrics.onTrackCount / metrics.activeGoals.length) * 100) 
    : 0;

  const getDaysLeft = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-700 font-['Inter']">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[32px] font-black text-[#dae2fd] tracking-tight leading-tight">
            Active Goals
          </h2>
          <p className="text-[#8b949e] text-[14px] mt-1">
            Focusing on <span className="text-[#c7c4d7]">{metrics.activeGoals.length} active goal{metrics.activeGoals.length !== 1 ? 's' : ''}</span> for this period.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingGoal(null); }}
          className="flex items-center gap-2 bg-[#7c79ff] hover:bg-[#6d69f0] text-white text-[13px] font-bold px-5 py-2.5 rounded-[10px] transition-all active:scale-95 shadow-lg shadow-[#7c79ff]/20"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Add/Edit Goal Form */}
      {showForm && (
        <div className="bg-[#171f33] border border-[#ffffff0a] rounded-[14px] p-6 animate-in zoom-in-95 duration-200">
          <h3 className="text-[18px] font-bold text-[#dae2fd] mb-5">{editingGoal ? 'Edit Goal' : 'Add New Goal'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Goal Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px]"
                placeholder="e.g. Complete Product Launch"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px] resize-none h-20"
                placeholder="Describe your goal..."
              />
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full appearance-none bg-[#0d1117] text-[#c7c4d7] px-3 py-3 rounded-[8px] border border-[#30363d] hover:border-[#7c79ff] focus:border-[#7c79ff] focus:outline-none text-[14px] cursor-pointer transition-all pr-8"
                style={{
                  backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%238b949e%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  backgroundSize: '12px',
                }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px]"
                style={{ colorScheme: 'dark' }}
              />
              <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                  filter: brightness(0) invert(1) brightness(1.2);
                  cursor: pointer;
                }
              `}</style>
              <p className="text-[10px] text-[#8b949e] mt-1">Must be at least 1 day from today</p>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" className="bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold px-8 py-3 rounded-[10px] transition-all active:scale-95 text-[14px]">
                {editingGoal ? 'Save Changes' : 'Create Goal'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingGoal(null); }} className="bg-[#222a3d] hover:bg-[#2d3449] text-[#c7c4d7] font-bold px-8 py-3 rounded-[10px] transition-all text-[14px]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal Cards */}
      <div className="space-y-4">
        {metrics.activeGoals.map(goal => {
          const daysLeft = getDaysLeft(goal.deadline);
          const isCritical = daysLeft !== null && daysLeft <= 5;
          const priorityColors: Record<string, { bg: string; text: string }> = {
            low: { bg: '#4b5563', text: '#a0aec0' },
            medium: { bg: '#2d2a1a', text: '#f59e0b' },
            high: { bg: '#1e3a5f', text: '#60a5fa' },
          };
          const priority = goal.priority || 'medium';
          const pc = priorityColors[priority];

          return (
            <div
              key={goal.id}
              className="group bg-[#171f33] border border-[#ffffff08] hover:border-[#ffffff15] rounded-[14px] p-6 transition-all"
            >
              {/* Header with actions */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[18px] font-bold text-[#dae2fd] mb-1">{goal.title}</h3>
                  {goal.description && <p className="text-[12px] text-[#8b949e] mb-2">{goal.description}</p>}
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[4px] inline-block"
                    style={{ backgroundColor: pc.bg, color: pc.text }}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                  </span>
                </div>
                {/* Actions on hover */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleEdit(goal)}
                    className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#7c79ff] transition-all"
                    title="Edit goal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#f85149] transition-all"
                    title="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar section - always show */}
              <div className="pt-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest">Progress</span>
                  <span className="text-[11px] font-semibold text-[#c7c4d7]">
                    {goalProgress[goal.id]?.completed || 0}/{goalProgress[goal.id]?.total || 0}
                  </span>
                </div>
                <div className="w-full bg-[#222a3d] rounded-full h-2 overflow-hidden border border-[#ffffff08]">
                  <div
                    className="h-full bg-gradient-to-r from-[#7c79ff] to-[#60a5fa] transition-all duration-500"
                    style={{
                      width: `${goalProgress[goal.id]?.total ? (goalProgress[goal.id]!.completed / goalProgress[goal.id]!.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                {/* Auto-complete indicator */}
                {goalProgress[goal.id] && goalProgress[goal.id].completed === goalProgress[goal.id].total && goalProgress[goal.id].total > 0 && (
                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-[#22c55e] font-semibold animate-pulse">✓ All items complete</p>
                  </div>
                )}
              </div>

              {/* Deadline section */}
              {daysLeft !== null && (
                <div className="flex items-center justify-start gap-2 pt-3 border-t border-[#ffffff08] mt-3">
                  {isCritical ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-[#fb923c]" />
                      <span className="text-[12px] text-[#fb923c] font-semibold">Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-[#8b949e]" />
                      <span className="text-[12px] text-[#8b949e] font-medium">{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Completed goals section */}
        {metrics.completedGoals.length > 0 && (
          <div className="space-y-2 mt-6 pt-6 border-t border-[#ffffff08]">
            <h3 className="text-[14px] font-bold text-[#8b949e] mb-2">Completed Goals ({metrics.completedGoals.length})</h3>
            {metrics.completedGoals.map(goal => (
              <div
                key={goal.id}
                id={`goal-${goal.id}`}
                className={`group bg-[#0f1520] border border-[#ffffff05] rounded-[12px] p-4 flex items-center justify-between transition-all ${
                  highlightId === goal.id 
                    ? 'border-[#7c79ff] ring-2 ring-[#7c79ff]/30 bg-[#1c2540] shadow-[0_0_20px_rgba(124,121,255,0.3)]' 
                    : 'opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0" />
                  <p className="text-[13px] text-[#8b949e] line-through truncate">{goal.title}</p>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-1.5 hover:bg-[#222a3d] rounded-[6px] text-[#8b949e] hover:text-[#f85149] opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-[#ffffff08]">
        {/* Goals Summary */}
        <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] mb-3">Active Goals</p>
          <p className="text-[40px] font-black text-[#dae2fd] leading-none">{metrics.activeGoals.length}</p>
          <p className="text-[12px] mt-1 font-semibold text-[#8b949e]">
            {metrics.completedGoals.length} completed in total
          </p>
        </div>

        {/* On Track */}
        <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-6 flex items-start justify-between">
          <div>
            <p className="text-[13px] font-bold text-[#dae2fd] mb-1">On Track for Completion</p>
            <p className="text-[12px] text-[#8b949e] leading-relaxed max-w-[240px]">
              {metrics.onTrackCount} of {metrics.activeGoals.length} active {metrics.activeGoals.length === 1 ? 'goal is' : 'goals are'} currently within their projected timelines.{' '}
              <span className={metrics.onTrackCount === metrics.activeGoals.length ? 'text-[#22c55e]' : 'text-[#c7c4d7]'}>
                {metrics.onTrackCount === metrics.activeGoals.length ? 'All systems optimal.' : 'Some adjustments needed.'}
              </span>
            </p>
          </div>
          <TrendingUp className="w-5 h-5 text-[#8b949e] shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
}
