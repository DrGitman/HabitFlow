import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, Award, Target, Zap, Activity, PieChart, Info } from 'lucide-react';

interface AnalyticsSummary {
  total_habits: number;
  total_tasks: number;
  completed_tasks: number;
  total_goals: number;
  completed_goals: number;
  completion_rate: number;
  week_completions: number;
  momentum: number;
}

interface ProgressData {
  date: string;
  count: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-[12px] shadow-2xl backdrop-blur-xl">
        <p className="text-[#8b949e] text-[12px] font-bold uppercase tracking-wider mb-2">{label}</p>
        <p className="text-[#e6edf3] text-[16px] font-black">
          {payload[0].value} <span className="text-[#8b949e] font-normal text-[14px]">completions</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [summaryRes, progressRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAnalyticsProgress(),
      ]);

      setSummary(summaryRes as AnalyticsSummary);
      setProgressData(progressRes as ProgressData[]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-[#58a6ff] animate-pulse" />
          <p className="text-[#8b949e] font-medium animate-pulse">Calculating Performance Metrics...</p>
        </div>
      </div>
    );
  }

  const weeklyData = progressData.slice(-7).map(item => ({
    day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    completions: item.count,
  }));

  const performanceData = [
    { metric: 'Consistency', value: summary?.completion_rate || 0 },
    { metric: 'Tasks', value: (summary?.completed_tasks || 0) / (summary?.total_tasks || 1) * 100 },
    { metric: 'Habits', value: (summary?.total_habits || 0) * 10 },
    { metric: 'Goals', value: (summary?.completed_goals || 0) / (summary?.total_goals || 1) * 100 },
    { metric: 'Streaks', value: (summary?.week_completions || 0) * 2 },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[32px] font-black text-[#e6edf3] tracking-tight">Analytics</h2>
          <p className="text-[#8b949e] text-[14px] mt-1 font-medium">Your Productivity Overview</p>
        </div>
        {summary?.momentum !== undefined && (
          <div className="flex items-center gap-3 bg-[#161b22] px-4 py-2 rounded-full border border-[#30363d]">
            <TrendingUp className={`w-4 h-4 ${summary.momentum >= 0 ? 'text-[#39d353]' : 'text-[#f85149]'}`} />
            <span className="text-[12px] font-black text-[#e6edf3]">
              Momentum: <span className={summary.momentum >= 0 ? 'text-[#39d353]' : 'text-[#f85149]'}>+{summary.momentum}%</span> vs last week
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Task Completion Rate', value: `${summary?.completion_rate || 0}%`, icon: TrendingUp, color: '#39d353', sub: 'Overall Progress' },
          { label: 'Tasks Completed (This Week)', value: summary?.week_completions || 0, icon: Zap, color: '#58a6ff', sub: 'Completed Tasks' },
          { label: 'Goal Progress', value: `${summary?.completed_goals || 0}/${summary?.total_goals || 0}`, icon: Target, color: '#f85149', sub: 'Goals Achieved' },
          { label: 'Active Habits', value: summary?.total_habits || 0, icon: Activity, color: '#bc8cff', sub: 'Habits in Progress' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-[16px] p-6 group hover:border-[#444c56] transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-[12px] transition-transform group-hover:scale-110" style={{ backgroundColor: `${stat.color}15` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <Info className="w-4 h-4 text-[#30363d] cursor-help" />
            </div>
            <h4 className="text-[#8b949e] text-[12px] font-bold uppercase tracking-widest mb-1">{stat.label}</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-black text-[#e6edf3]">{stat.value}</span>
            </div>
            <p className="text-[11px] text-[#8b949e] mt-2 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Over Time */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-[24px] p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[20px] font-black text-[#e6edf3] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#58a6ff]" />
              Productivity Flow
            </h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-[#1c2128] text-[#8b949e] text-[11px] font-black rounded-full border border-[#30363d]">LAST 30 DAYS</span>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#484f58" 
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#484f58" 
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#58a6ff" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill/Performance Radar */}
        <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] rounded-[24px] p-8 min-w-[400px]">
          <h3 className="text-[18px] font-black text-[#e6edf3] flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-[#bc8cff]" />
            Capacities
          </h3>
          <div className="h-[320px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={performanceData}>
                <PolarGrid stroke="#30363d" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#8b949e', fontSize: 11, fontWeight: 600 }} tickLine={false} />
                <Radar
                  name="System"
                  dataKey="value"
                  stroke="#bc8cff"
                  fill="#bc8cff"
                  fillOpacity={0.4}
                  strokeWidth={3}
                  animationDuration={2500}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-[24px] p-8">
        <h3 className="text-[20px] font-black text-[#e6edf3] flex items-center gap-2 mb-8">
          <BarChart className="w-5 h-5 text-[#39d353]" />
          Weekly Velocity
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#484f58" 
                tick={{ fontSize: 11, fontWeight: 800 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#484f58" 
                tick={{ fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: '#30363d', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px' }}
              />
              <Bar 
                dataKey="completions" 
                fill="#39d353" 
                radius={[6, 6, 0, 0]} 
                barSize={40}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
