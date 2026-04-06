import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { Chart as ChartJS, LineElement, PointElement, Tooltip as ChartJSTooltip, Legend as ChartJSLegend, RadialLinearScale, Filler } from 'chart.js';
import { Chart as ChartComponent } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Award, Target, Zap, Activity, PieChart, Info } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  LineElement,
  PointElement,
  ChartJSTooltip,
  ChartJSLegend,
  RadialLinearScale,
  Filler
);

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
        <p className="text-[#e6edf3] text-[12px] font-bold uppercase tracking-wider mb-2">{label}</p>
        <p className="text-[#e6edf3] text-[16px] font-black">
          {payload[0].value} <span className="text-[#e6edf3] font-normal text-[14px]">completions</span>
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
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const syncTheme = () => setIsLightTheme(document.body.classList.contains('light-theme'));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const date = new Date().toLocaleDateString('sv-SE');
      const [summaryRes, progressRes] = await Promise.all([
        api.getAnalyticsSummary(date),
        api.getAnalyticsProgress(date),
      ]);

      console.log('Analytics Summary:', summaryRes);
      console.log('Progress Data:', progressRes);

      if (summaryRes) {
        setSummary(summaryRes as AnalyticsSummary);
      }
      if (progressRes && Array.isArray(progressRes)) {
        setProgressData(progressRes as ProgressData[]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh] p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Info className="w-12 h-12 text-[#f85149]" />
          <p className="text-[#8b949e] font-medium">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-[#238636] text-white rounded-lg font-medium hover:bg-[#2ea043] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            {summary.momentum >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#39d353]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#f85149]" />
            )}
            <span className="text-[12px] font-black text-[#e6edf3]">
              Momentum: <span className={summary.momentum >= 0 ? 'text-[#39d353]' : 'text-[#f85149]'}>
                {summary.momentum >= 0 ? '+' : ''}{summary.momentum}%
              </span> vs last week
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Task Completion Rate', value: `${summary?.total_tasks ? Math.round((summary.completed_tasks / summary.total_tasks) * 100) : 0}%`, icon: TrendingUp, color: '#39d353', sub: 'Overall Progress' },
          { label: 'Tasks Completed (This Week)', value: summary?.completed_tasks ?? 0, icon: Zap, color: '#58a6ff', sub: 'Completed Tasks' },
          { label: 'Goal Progress', value: `${summary?.completed_goals ?? 0}/${summary?.total_goals ?? 0}`, icon: Target, color: '#f85149', sub: 'Goals Achieved' },
          { label: 'Active Habits', value: summary?.total_habits ?? 0, icon: Activity, color: '#bc8cff', sub: 'Habits in Progress' },
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
          {progressData && progressData.length > 0 ? (
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
          ) : (
            <div className="h-[350px] w-full flex items-center justify-center">
              <div className="text-center">
                <Activity className="w-12 h-12 text-[#30363d] mx-auto mb-3" />
                <p className="text-[#8b949e] font-medium">No data yet - start completing habits to see your productivity flow</p>
              </div>
            </div>
          )}
        </div>

        {/* Skill/Performance Radar Chart using Chart.js */}
        <div className="lg:col-span-1 bg-[#161b22] border border-[#30363d] rounded-[24px] p-8">
          <h3 className="text-[18px] font-black text-[#e6edf3] flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-[#bc8cff]" />
            Capacities
          </h3>
          <div className="h-[340px] w-full flex items-center justify-center">
            {summary && (
              <ChartComponent
                type="radar"
                data={{
                  labels: ['Consistency', 'Tasks', 'Habits', 'Goals', 'Streaks'],
                  datasets: [
                    {
                      data: [
                        summary.completion_rate || 0,
                        summary.total_tasks && summary.completed_tasks 
                          ? (summary.completed_tasks / summary.total_tasks) * 100
                          : 0,
                        summary.total_goals && summary.completed_goals
                          ? (summary.completed_goals / summary.total_goals) * 100
                          : 0,
                        summary.total_habits && summary.week_completions
                          ? (summary.week_completions / summary.total_habits) * 100
                          : 0,
                        summary.total_habits ? (summary.total_habits / 10) * 100 : 0,
                      ],
                      backgroundColor: 'rgba(124, 121, 255, 0.35)',
                      borderColor: '#58a6ff',
                      borderWidth: 2.5,
                      pointBackgroundColor: '#ff006e',
                      pointBorderColor: '#161b22',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      pointHoverRadius: 8,
                      fill: true,
                      tension: 0,
                      borderCapStyle: 'round',
                      borderJoinStyle: 'round',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    tooltip: {
                      backgroundColor: '#161b22',
                      titleColor: '#8b949e',
                      bodyColor: '#e6edf3',
                      borderColor: '#30363d',
                      borderWidth: 1,
                      padding: 12,
                      titleFont: { size: 12, weight: 'bold' },
                      bodyFont: { size: 14, weight: 'bold' },
                      displayColors: false,
                    },
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    r: {
                      min: 0,
                      max: 100,
                      ticks: {
                        display: false,
                        stepSize: 20,
                      },
                      grid: {
                        color: '#30363d',
                      },
                      pointLabels: {
                        color: isLightTheme ? '#334155' : '#e6edf3',
                        font: { size: 13, weight: 'bold' },
                        padding: 15,
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-[24px] p-8">
        <h3 className="text-[20px] font-black text-[#e6edf3] flex items-center gap-2 mb-8">
          <BarChart className="w-5 h-5 text-[#39d353]" />
          Weekly Velocity
        </h3>
        {weeklyData && weeklyData.length > 0 ? (
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
                content={<CustomTooltip />}
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
        ) : (
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center">
              <BarChart className="w-12 h-12 text-[#30363d] mx-auto mb-3" />
              <p className="text-[#8b949e] font-medium">No data yet - start completing habits to see weekly velocity</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
