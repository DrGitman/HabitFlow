import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Check, Trash2, Edit2, Flame, Target, Calendar, Tag, CheckCircle2 } from 'lucide-react';

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
  streak?: number; // Assuming streak might be available or handled
}

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    frequency: 'daily',
    target_count: 1,
    color: '#39d353',
  });

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const [habitsData, streaksData] = await Promise.all([
        api.getHabits(),
        api.getAnalyticsStreaks()
      ]);
      setHabits(habitsData as Habit[]);
      setStreaks(streaksData as any[]);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHabit) {
        await api.updateHabit(editingHabit.id, formData);
      } else {
        await api.createHabit(formData);
      }
      setFormData({ name: '', description: '', category: '', frequency: 'daily', target_count: 1, color: '#39d353' });
      setShowForm(false);
      setEditingHabit(null);
      fetchHabits();
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const handleComplete = async (habitId: number) => {
    try {
      await api.completeHabit(habitId);
      // In a real app, we'd update the local state or refetch streaks
      fetchHabits();
    } catch (error) {
      console.error('Error completing habit:', error);
    }
  };

  const handleDelete = async (habitId: number) => {
    if (confirm('Are you sure you want to delete this habit?')) {
      try {
        await api.deleteHabit(habitId);
        fetchHabits();
      } catch (error) {
        console.error('Error deleting habit:', error);
      }
    }
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      description: habit.description || '',
      category: habit.category || '',
      frequency: habit.frequency,
      target_count: habit.target_count,
      color: habit.color || '#39d353',
    });
    setShowForm(true);
  };

  const habitColors = ['#39d353', '#58a6ff', '#f85149', '#d29922', '#bc8cff'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[32px] font-black text-[#e6edf3] tracking-tight">Habits</h2>
          <p className="text-[#8b949e] text-[14px] mt-1 font-medium">Architechting a more disciplined version of yourself.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingHabit(null);
            setFormData({ name: '', description: '', category: '', frequency: 'daily', target_count: 1, color: '#39d353' });
          }}
          className="bg-[#2ea043] hover:bg-[#2c974b] text-[#ffffff] font-bold px-6 py-3 rounded-[10px] flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#2ea043]/10"
        >
          <Plus className="w-5 h-5" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habit Form */}
      {showForm && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-[12px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-[20px] font-bold text-[#e6edf3] mb-6">
            {editingHabit ? 'Refine Habit' : 'Initialize New Habit'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Habit Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#2ea043] focus:outline-none transition-all"
                    placeholder="e.g. Deep Work, Meditation..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#2ea043] focus:outline-none transition-all"
                    placeholder="Why is this habit important?"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#2ea043] focus:outline-none transition-all"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Target/Day</label>
                    <input
                      type="number"
                      value={formData.target_count}
                      onChange={(e) => setFormData({ ...formData, target_count: parseInt(e.target.value) })}
                      className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#2ea043] focus:outline-none transition-all"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Visual Theme</label>
                  <div className="flex gap-4">
                    {habitColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                          formData.color === color ? 'ring-2 ring-[#e6edf3] scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {formData.color === color && <Check className="w-5 h-5 text-[#0d1117]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="bg-[#2ea043] hover:bg-[#2c974b] text-[#ffffff] font-bold px-8 py-3 rounded-[10px] transition-all active:scale-95"
              >
                {editingHabit ? 'Save Architect' : 'Establish Habit'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingHabit(null);
                }}
                className="bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-bold px-8 py-3 rounded-[10px] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="group bg-[#161b22] border border-[#30363d] rounded-[16px] p-6 relative overflow-hidden transition-all hover:border-[#30363d] hover:shadow-2xl hover:-translate-y-1"
          >
            <div
              className="absolute top-0 left-0 bottom-0 w-[4px] opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: habit.color || '#39d353' }}
            />
            
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-[20px] font-black text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">{habit.name}</h3>
                {habit.category && (
                  <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#8b949e]">{habit.category}</span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 text-[#8b949e]">
                <Flame className={`w-5 h-5 ${streaks.find(s => s.habit_id === habit.id)?.current_streak > 0 ? 'text-[#ff7b72] animate-pulse' : 'text-[#30363d]'}`} />
                <span className="text-[10px] font-bold">STREAK: {streaks.find(s => s.habit_id === habit.id)?.current_streak || 0}</span>
              </div>
            </div>

            {habit.description && (
              <p className="text-[#8b949e] text-[14px] leading-relaxed mb-6 line-clamp-2 italic">"{habit.description}"</p>
            )}

            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#e6edf3] bg-[#21262d] px-3 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                <span className="capitalize">{habit.frequency}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#e6edf3] bg-[#21262d] px-3 py-1.5 rounded-full">
                <Target className="w-3.5 h-3.5" />
                <span>{habit.target_count}pt</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleComplete(habit.id)}
                className="flex-1 bg-[#238636] hover:bg-[#2ea043] text-[#ffffff] font-bold py-3 rounded-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#238636]/10"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Check-in</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(habit)}
                  className="p-3 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#58a6ff] rounded-[10px] transition-all"
                  title="Edit Habit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(habit.id)}
                  className="p-3 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#f85149] rounded-[10px] transition-all"
                  title="Delete Habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && habits.length === 0 && (
          <div className="col-span-full py-20 bg-[#161b22]/50 rounded-[16px] border border-dashed border-[#30363d] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[#21262d] rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-[#8b949e]" />
            </div>
            <h4 className="text-[18px] font-bold text-[#e6edf3] mb-2">No Habits Defined</h4>
            <p className="text-[#8b949e] max-w-[300px]">The architect starts with a single blueprint. Create your first habit above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
