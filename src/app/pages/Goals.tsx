import { useState } from 'react';
import { Trophy, Plus, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface Goal {
  id: number;
  priority: 'HIGH PRIORITY' | 'PERSONAL' | 'CRITICAL' | 'SUCCESS';
  category: string;
  title: string;
  progress: number;
  daysLeft?: number;
  completedDate?: string;
  priorityColor: string;
  categoryColor: string;
  barColor: string;
}

const SAMPLE_GOALS: Goal[] = [
  {
    id: 1,
    priority: 'HIGH PRIORITY',
    category: 'Strategic Growth',
    title: 'Complete Certification: Cloud Architecture',
    progress: 65,
    daysLeft: 12,
    priorityColor: '#3b82f6',
    categoryColor: '#8b949e',
    barColor: '#7c79ff',
  },
  {
    id: 2,
    priority: 'PERSONAL',
    category: 'Health & Wellness',
    title: 'Marathon Preparation: Sub-4 Goal',
    progress: 42,
    daysLeft: 48,
    priorityColor: '#a855f7',
    categoryColor: '#8b949e',
    barColor: '#7c79ff',
  },
  {
    id: 3,
    priority: 'CRITICAL',
    category: 'Financial Planning',
    title: 'Establish Investment Portfolio Diversity',
    progress: 88,
    daysLeft: 3,
    priorityColor: '#f59e0b',
    categoryColor: '#8b949e',
    barColor: '#7c79ff',
  },
  {
    id: 4,
    priority: 'SUCCESS',
    category: 'Skill Acquisition',
    title: 'Learn Advanced Typography Principles',
    progress: 100,
    completedDate: 'July 12',
    priorityColor: '#22c55e',
    categoryColor: '#8b949e',
    barColor: '#22c55e',
  },
];

const priorityStyles: Record<string, { bg: string; text: string }> = {
  'HIGH PRIORITY': { bg: '#1d4ed820', text: '#60a5fa' },
  PERSONAL: { bg: '#7e22ce20', text: '#c084fc' },
  CRITICAL: { bg: '#d9770620', text: '#fb923c' },
  SUCCESS: { bg: '#16a34a20', text: '#4ade80' },
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(SAMPLE_GOALS);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    priority: 'HIGH PRIORITY' as Goal['priority'],
    progress: 0,
    daysLeft: 30,
  });

  const focusEfficiency = Math.round(
    goals.filter(g => g.progress < 100 && (g.daysLeft ?? 9999) > 0).reduce((acc, g) => acc + g.progress, 0) /
    Math.max(goals.filter(g => g.progress < 100).length, 1)
  );

  const onTrackCount = goals.filter(g => g.progress < 100 && (g.daysLeft ?? 0) >= 3).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Goal = {
      id: Date.now(),
      priority: formData.priority,
      category: formData.category,
      title: formData.title,
      progress: formData.progress,
      daysLeft: formData.daysLeft,
      priorityColor: priorityStyles[formData.priority].text,
      categoryColor: '#8b949e',
      barColor: formData.priority === 'SUCCESS' ? '#22c55e' : '#7c79ff',
    };
    setGoals(prev => [newGoal, ...prev]);
    setShowForm(false);
    setFormData({ title: '', category: '', priority: 'HIGH PRIORITY', progress: 0, daysLeft: 30 });
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-700 font-['Inter']">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[32px] font-black text-[#dae2fd] tracking-tight leading-tight">
            Quarterly Milestones
          </h2>
          <p className="text-[#8b949e] text-[14px] mt-1">
            Focusing on <span className="text-[#c7c4d7]">high-impact outcomes</span> for Q3 performance.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#7c79ff] hover:bg-[#6d69f0] text-white text-[13px] font-bold px-5 py-2.5 rounded-[10px] transition-all active:scale-95 shadow-lg shadow-[#7c79ff]/20"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <div className="bg-[#171f33] border border-[#ffffff0a] rounded-[14px] p-6 animate-in zoom-in-95 duration-200">
          <h3 className="text-[18px] font-bold text-[#dae2fd] mb-5">Add New Goal</h3>
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
            <div>
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px]"
                placeholder="e.g. Strategic Growth"
                required
              />
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as Goal['priority'] })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px]"
              >
                <option value="HIGH PRIORITY">High Priority</option>
                <option value="PERSONAL">Personal</option>
                <option value="CRITICAL">Critical</option>
                <option value="SUCCESS">Success</option>
              </select>
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Progress (%)</label>
              <input
                type="number"
                value={formData.progress}
                onChange={e => setFormData({ ...formData, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px]"
                min="0" max="100"
              />
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-bold uppercase tracking-widest mb-2">Days Left</label>
              <input
                type="number"
                value={formData.daysLeft}
                onChange={e => setFormData({ ...formData, daysLeft: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[8px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:outline-none transition-all text-[14px]"
                min="0"
              />
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" className="bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold px-8 py-3 rounded-[10px] transition-all active:scale-95 text-[14px]">
                Create Goal
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-[#222a3d] hover:bg-[#2d3449] text-[#c7c4d7] font-bold px-8 py-3 rounded-[10px] transition-all text-[14px]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal Cards */}
      <div className="space-y-4">
        {goals.map(goal => {
          const ps = priorityStyles[goal.priority];
          const isComplete = goal.progress === 100;
          const isCritical = !isComplete && (goal.daysLeft ?? 9999) <= 5;

          return (
            <div
              key={goal.id}
              className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-6 hover:border-[#ffffff15] transition-all group"
            >
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[4px]"
                  style={{ backgroundColor: ps.bg, color: ps.text }}
                >
                  {goal.priority}
                </span>
                <span className="text-[12px] text-[#8b949e] font-medium">{goal.category}</span>
              </div>

              {/* Title row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3
                  className={`text-[18px] font-bold leading-snug ${isComplete ? 'text-[#8b949e] line-through' : 'text-[#dae2fd]'
                    }`}
                >
                  {goal.title}
                </h3>
                <div className="text-right shrink-0">
                  <span className={`text-[28px] font-black leading-none ${isComplete ? 'text-[#22c55e]' : 'text-[#dae2fd]'}`}>
                    {goal.progress}%
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {isComplete ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-[#22c55e]" />
                        <span className="text-[11px] text-[#22c55e] font-semibold">Completed {goal.completedDate}</span>
                      </>
                    ) : isCritical ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-[#fb923c]" />
                        <span className="text-[11px] text-[#fb923c] font-semibold">{goal.daysLeft} days left</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-[#8b949e]" />
                        <span className="text-[11px] text-[#8b949e] font-medium">{goal.daysLeft} days left</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#222a3d] rounded-full h-[4px] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${goal.progress}%`,
                    backgroundColor: goal.barColor,
                    boxShadow: `0 0 8px ${goal.barColor}60`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {/* Focus Efficiency */}
        <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#8b949e] mb-3">Focus Efficiency</p>
          <p className="text-[40px] font-black text-[#dae2fd] leading-none">{focusEfficiency}%</p>
          <p className="text-[12px] text-[#22c55e] mt-1 font-semibold">+4% from last month</p>
        </div>

        {/* On Track */}
        <div className="bg-[#171f33] border border-[#ffffff08] rounded-[14px] p-6 flex items-start justify-between">
          <div>
            <p className="text-[13px] font-bold text-[#dae2fd] mb-1">On Track for Q3 Closure</p>
            <p className="text-[12px] text-[#8b949e] leading-relaxed max-w-[240px]">
              {onTrackCount} of {goals.filter(g => g.progress < 100).length} active goals are currently within their projected timelines.{' '}
              <span className="text-[#c7c4d7]">Performance is optimal.</span>
            </p>
          </div>
          <TrendingUp className="w-5 h-5 text-[#8b949e] shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
}
