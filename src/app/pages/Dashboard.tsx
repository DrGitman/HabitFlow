import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Flame, Calendar, Activity, TrendingUp, MoreHorizontal, ArrowUpRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';

interface AnalyticsSummary {
  total_habits: number;
  total_tasks: number;
  completed_tasks: number;
  total_goals: number;
  completed_goals: number;
  completion_rate: number;
  week_completions: number;
}

interface ProgressData {
  date: string;
  count: number;
}

interface RecentActivity {
  type: string;
  label: string;
  category: string;
  occurred_at: string | null;
}

interface StreakData {
  habit_id: number;
  habit_name: string;
  current_streak: number;
  color?: string;
  is_completed_today?: boolean;
}

// Helper to generate heatmap data from real progress
const generateHeatmapData = (progress: ProgressData[]) => {
  if (!progress.length) {
    return Array(28).fill({ intensity: 0 });
  }
  // Take last 28 days or pad with empty objects
  const last28 = progress.slice(-28);
  const data = last28.map(item => ({
    intensity: item.count > 5 ? 4 : item.count > 2 ? 3 : item.count > 1 ? 2 : item.count > 0 ? 1 : 0
  }));
  
  // Pad if less than 28
  while (data.length < 28) {
    data.unshift({ intensity: 0 });
  }
  return data;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, progressRes, streaksRes, activityRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAnalyticsProgress(),
        api.getAnalyticsStreaks(),
        api.getRecentActivity(),
      ]);

      setSummary(summaryRes as AnalyticsSummary);
      setProgressData(progressRes as ProgressData[]);
      setStreakData(streaksRes as StreakData[]);
      setRecentActivity(activityRes as RecentActivity[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#0a0c10]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#7c79ff]/10 border-t-[#7c79ff] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#7c79ff] animate-pulse" />
            </div>
          </div>
          <p className="text-[#8b949e] font-bold uppercase tracking-[0.2em] text-[11px] animate-pulse">Syncing System Matrix...</p>
        </div>
      </div>
    );
  }

  const weekData = progressData.slice(-7).map(item => ({
    day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    completions: item.count,
  }));

  const heatmapData = generateHeatmapData(progressData);

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-[#ffffff] text-[24px] font-black tracking-[0.2em] leading-none uppercase mb-2">HABITFLOW</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#39d353] shadow-[0_0_8px_rgba(57,211,83,0.5)]" />
            <p className="text-[#8b949e] text-[11px] font-black uppercase tracking-[0.15em] opacity-60">System Active</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
           <div className="bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-[10px] flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#7c79ff]" />
              <span className="text-[#e6edf3] text-[13px] font-bold uppercase tracking-wider">
                {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
           </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Total Tasks', value: summary?.total_tasks || 0, color: '#7c79ff', path: '/actions', icon: Activity },
          { label: 'Completed', value: summary?.completed_tasks || 0, color: '#39d353', path: '/actions', icon: CheckCircle2 },
          { label: 'Efficiency', value: `${summary?.completion_rate || 0}%`, color: '#ff7b72', path: '/analytics', icon: TrendingUp }
        ].map((stat, i) => (
          <button 
            key={i}
            onClick={() => navigate(stat.path)}
            className="bg-[#161b22]/50 backdrop-blur-sm border border-[#30363d] rounded-[20px] p-8 hover:bg-[#161b22] hover:border-[#30363d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all group relative overflow-hidden text-left"
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
               <ArrowUpRight className="w-5 h-5 text-[#8b949e]" />
            </div>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-[8px] bg-white/5 border border-white/10">
                   <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <p className="text-[#8b949e] text-[11px] font-black uppercase tracking-[0.15em]">{stat.label}</p>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[52px] font-black text-[#e6edf3] leading-none tracking-tighter">{stat.value}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Grid: Performance & Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-[#161b22]/50 backdrop-blur-sm border border-[#30363d] rounded-[24px] p-10">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-1">
              <h3 className="text-[20px] font-bold text-[#e6edf3]">Goal Progress</h3>
              <p className="text-[#8b949e] text-[12px] font-medium uppercase tracking-widest opacity-60">Weekly Task Completions</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c79ff" />
                    <stop offset="100%" stopColor="#6360ff" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#30363d" opacity={0.5} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8b949e', fontSize: 10, fontWeight: '900', letterSpacing: '0.1em' }} 
                  dy={15}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '12px',
                    color: '#e6edf3',
                    fontSize: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                />
                <Bar 
                  dataKey="completions" 
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]} 
                  barSize={50}
                  className="cursor-pointer"
                >
                  {weekData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fillOpacity={0.8 + (index / 10)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar: Adaptive Systems */}
        <div className="space-y-8 flex flex-col">
          {/* Active Synapse (Habits) */}
          <div className="bg-[#161b22]/50 backdrop-blur-sm border border-[#30363d] rounded-[24px] p-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[18px] font-bold text-[#e6edf3]">Active Habits</h3>
              <MoreHorizontal className="w-5 h-5 text-[#8b949e] cursor-pointer hover:text-[#e6edf3] transition-colors" />
            </div>
            
            <div className="space-y-4 flex-1">
              {streakData.length > 0 ? (
                streakData.slice(0, 4).map((streak) => (
                  <div key={streak.habit_id} className="bg-[#0d1117]/50 border border-[#30363d] rounded-[14px] p-5 flex items-center justify-between group hover:border-[#7c79ff]/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[10px] bg-[#161b22] border border-[#30363d] flex items-center justify-center group-hover:bg-[#7c79ff]/10 group-hover:border-[#7c79ff]/30 transition-all">
                        <Flame className={`w-5 h-5 ${streak.current_streak > 0 ? 'text-[#ff7b72]' : 'text-[#8b949e]'}`} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#e6edf3] group-hover:text-[#7c79ff] transition-colors">{streak.habit_name}</p>
                        <p className="text-[10px] text-[#8b949e] uppercase tracking-[0.1em] font-black mt-0.5">{streak.current_streak} DAY STREAK</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-[6px] border-2 transition-all flex items-center justify-center ${streak.is_completed_today ? 'bg-[#39d353] border-[#39d353]' : 'border-[#30363d] group-hover:border-[#7c79ff]'}`}>
                      {streak.is_completed_today && <CheckCircle2 className="w-4 h-4 text-[#0d1117] stroke-[3px]" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-40">
                  <Zap className="w-10 h-10 text-[#8b949e]" />
                  <p className="text-[#8b949e] text-[13px] font-medium uppercase tracking-widest">No Active Habits</p>
                </div>
              )}
            </div>

            {/* Consistency Heatmap */}
            <div className="mt-10 pt-10 border-t border-[#30363d]">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="text-[10px] font-black text-[#8b949e] uppercase tracking-[0.2em] opacity-60">Consistency Grid</h4>
                 <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4].map(v => (
                       <div key={v} className="w-2.5 h-2.5 rounded-[1px]" style={{ backgroundColor: v === 0 ? '#161b22' : v === 1 ? '#0e4429' : v === 2 ? '#26a641' : v === 3 ? '#39d353' : '#39d353' }} />
                    ))}
                 </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {heatmapData.map((day, i) => {
                  const colors = ['#161b22', '#0e4429', '#006d32', '#219641', '#39d353'];
                  return (
                    <div 
                      key={i} 
                      className="w-full aspect-square rounded-[2px] transition-all hover:scale-125 cursor-help" 
                      style={{ backgroundColor: colors[day.intensity] }}
                      title={`Stability Level: ${day.intensity}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-[#161b22]/50 backdrop-blur-sm border border-[#30363d] rounded-[24px] p-10 mt-8 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[18px] font-bold text-[#e6edf3]">Recent Activity</h3>
        </div>

        <div className="space-y-6">
          {recentActivity.length > 0 ? (
            <>
              {recentActivity.slice(0, 3).map((event, i) => {
                const getActivityInfo = (type: string) => {
                  switch(type) {
                    case 'task_created': return { color: '#58a6ff', text: 'Created task' };
                    case 'task_completed': return { color: '#39d353', text: 'Completed task' };
                    case 'habit_completed': return { color: '#39d353', text: 'Completed habit' };
                    case 'goal_created': return { color: '#f85149', text: 'Created goal' };
                    case 'goal_completed': return { color: '#f85149', text: 'Completed goal' };
                    default: return { color: '#8b949e', text: 'Activity' };
                  }
                };
                const activity = getActivityInfo(event.type);
                const timeAgo = event.occurred_at
                  ? (() => {
                      try {
                        const eventDate = new Date(event.occurred_at);
                        if (isNaN(eventDate.getTime())) return 'Recently';
                        
                        const now = new Date();
                        const diff = now.getTime() - eventDate.getTime();
                        
                        if (diff < 0) return 'Just now';
                        
                        const mins = Math.floor(diff / 60000);
                        const hrs = Math.floor(mins / 60);
                        const days = Math.floor(hrs / 24);
                        
                        if (days > 0) return `${days}d ago`;
                        if (hrs > 0) return `${hrs}h ago`;
                        if (mins > 0) return `${mins}m ago`;
                        return 'Just now';
                      } catch {
                        return 'Recently';
                      }
                    })()
                  : 'Recently';
                return (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1.5 flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activity.color }} />
                    </div>
                    <div>
                      <p className="text-[#e6edf3] text-[14px]">
                        {activity.text}: &ldquo;{event.label}&rdquo;
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[#8b949e] text-[11px]">{timeAgo} &bull; {event.category}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentActivity.length > 3 && (
                <button
                  onClick={() => navigate('/analytics')}
                  className="text-[#7c79ff] text-[13px] font-medium hover:underline mt-2"
                >
                  See more
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 opacity-40">
              <Zap className="w-8 h-8 text-[#8b949e] mb-3" />
              <p className="text-[#8b949e] text-[13px] uppercase tracking-widest">No recent activity yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
