import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Check, Trash2, Edit2, Calendar as CalendarIcon, Clock, Tag, AlertCircle, CheckCircle2 } from 'lucide-react';

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

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, formData);
      } else {
        await api.createTask(formData);
      }
      setFormData({ title: '', description: '', category: '', priority: 'medium', due_date: '' });
      setShowForm(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleComplete = async (taskId: number, isCompleted: boolean) => {
    try {
      await api.completeTask(taskId, !isCompleted);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await api.deleteTask(taskId);
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category || '',
      priority: task.priority,
      due_date: task.due_date || '',
    });
    setShowForm(true);
  };

  const priorityMeta = {
    low: { color: '#8b949e', bg: '#21262d' },
    medium: { color: '#58a6ff', bg: '#1f6feb20' },
    high: { color: '#f85149', bg: '#f8514910' },
  };

  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[32px] font-black text-[#e6edf3] tracking-tight">Tasks</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingTask(null);
            setFormData({ title: '', description: '', category: '', priority: 'medium', due_date: '' });
          }}
          className="bg-[#58a6ff] hover:bg-[#4a9eff] text-[#0d1117] font-bold px-6 py-3 rounded-[10px] flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#58a6ff]/10"
        >
          <Plus className="w-5 h-5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Task Form Modal-like */}
      {showForm && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-[12px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-[20px] font-bold text-[#e6edf3] mb-6">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#58a6ff] focus:outline-none transition-all"
                    placeholder="What needs to be done?"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#58a6ff] focus:outline-none transition-all"
                    placeholder="Add some details..."
                    rows={4}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-[#0d1117] text-[#e6edf3] pl-10 pr-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#58a6ff] focus:outline-none transition-all"
                      placeholder="e.g. Work, Health..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#58a6ff] focus:outline-none transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full bg-[#0d1117] text-[#e6edf3] px-4 py-3 rounded-[8px] border border-[#30363d] focus:border-[#58a6ff] focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="bg-[#2ea043] hover:bg-[#2c974b] text-[#ffffff] font-bold px-8 py-3 rounded-[10px] transition-all active:scale-95"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTask(null);
                }}
                className="bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] font-bold px-8 py-3 rounded-[10px] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Tasks */}
        <div className="space-y-6">
          <h3 className="text-[18px] font-bold text-[#e6edf3] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#58a6ff]" />
            Active Tasks
            <span className="ml-2 text-[12px] bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
          </h3>
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-[#161b22] border border-[#30363d] rounded-[12px] p-6 hover:border-[#58a6ff]/30 transition-all group relative"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleComplete(task.id, task.is_completed)}
                    className="mt-1 w-6 h-6 rounded-[6px] border-2 border-[#30363d] flex items-center justify-center hover:border-[#58a6ff] transition-all bg-[#0d1117]"
                  >
                    {task.is_completed && <Check className="w-4 h-4 text-[#58a6ff]" />}
                  </button>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="text-[17px] font-bold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">{task.title}</h4>
                        {(!task.is_completed && task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0))) && (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-[#f8514920] text-[#f85149] px-2 py-0.5 rounded-[4px] border border-[#f8514930] animate-pulse">
                            Expired
                          </span>
                        )}
                      </div>
                      <span 
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[4px]"
                        style={{ backgroundColor: priorityMeta[task.priority].bg, color: priorityMeta[task.priority].color }}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-[#8b949e] text-[14px] leading-relaxed line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      {task.category && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8b949e]">
                          <Tag className="w-3.5 h-3.5" />
                          {task.category}
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8b949e]">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-2 hover:bg-[#21262d] rounded-[6px] text-[#8b949e] hover:text-[#58a6ff] transition-all"
                      title="Edit Task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 hover:bg-[#21262d] rounded-[6px] text-[#8b949e] hover:text-[#f85149] transition-all"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-[#161b22]/50 rounded-[12px] border border-dashed border-[#30363d]">
                <CheckCircle2 className="w-12 h-12 text-[#30363d] mb-4" />
                <p className="text-[#8b949e] font-medium">All cleared! Time for the next architect move.</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="space-y-6">
          <h3 className="text-[18px] font-bold text-[#8b949e] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Archive
            <span className="ml-2 text-[12px] bg-[#21262d] text-[#8b949e]/50 px-2 py-0.5 rounded-full">{completedTasks.length}</span>
          </h3>
          <div className="space-y-3">
            {completedTasks.slice(0, 8).map((task) => (
              <div
                key={task.id}
                className="bg-[#0d1117] border border-[#30363d] rounded-[10px] p-4 flex items-center gap-4 opacity-50 hover:opacity-80 transition-all"
              >
                <button
                  onClick={() => handleComplete(task.id, task.is_completed)}
                  className="w-5 h-5 rounded-[4px] bg-[#2ea043] flex items-center justify-center text-[#0d1117]"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1">
                  <h4 className="text-[15px] font-medium text-[#e6edf3] line-through">{task.title}</h4>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 hover:bg-[#21262d] rounded-[6px] text-[#8b949e] hover:text-[#f85149] transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {completedTasks.length > 8 && (
              <p className="text-center text-[12px] text-[#8b949e] py-2">Plus {completedTasks.length - 8} more completed tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
