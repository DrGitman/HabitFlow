import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  startOfToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarEvent {
  id: number;
  type: 'task' | 'habit';
  title: string;
  date: string;
  is_completed: boolean;
  priority?: string;
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [calendarStats, setCalendarStats] = useState<any>(null);

  useEffect(() => {
    fetchCalendarData();
    fetchUpcomingTasks();
    fetchCalendarStats();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
      const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');
      const response: any = await api.getCalendarData(start, end);
      
      let fetchedEvents: CalendarEvent[] = [];
      if (response && response.tasks) {
        // Transform tasks
        const taskEvents = (response.tasks || []).map((task: any) => ({
          id: task.id,
          type: 'task' as const,
          title: task.title,
          date: task.due_date,
          is_completed: task.is_completed,
          priority: task.priority
        }));
        // Transform habit completions
        const habitEvents = (response.completions || []).map((c: any) => ({
          id: c.id,
          type: 'habit' as const,
          title: c.name,
          date: c.completion_date,
          is_completed: true
        }));
        fetchedEvents = [...taskEvents, ...habitEvents];
      }
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingTasks = async () => {
    try {
      const tasks = await api.getUpcomingTasks();
      setUpcomingTasks(tasks as any[]);
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      setUpcomingTasks([]);
    }
  };

  const fetchCalendarStats = async () => {
    try {
      const stats = await api.getCalendarStats();
      setCalendarStats(stats as any);
    } catch (error) {
      console.error('Error fetching calendar stats:', error);
      setCalendarStats(null);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      <div className="flex items-center gap-6">
        <h2 className="text-[20px] font-bold text-[#ffffff] tracking-tight">
          Monthly Planner
        </h2>
        <div className="flex bg-[#161b22] border border-[#ffffff0a] rounded-[24px] p-1">
          {(['Day', 'Week', 'Month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v.toLowerCase() as any)}
              className={`px-4 py-1.5 text-[12px] font-bold capitalize tracking-wide rounded-[20px] transition-all ${
                view === v.toLowerCase() 
                  ? 'bg-[#30363d] text-[#ffffff] shadow-sm' 
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={prevMonth}
          className="p-1 hover:text-[#e6edf3] text-[#8b949e] transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] font-medium text-[#ffffff]">
           {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button 
          onClick={nextMonth}
          className="p-1 hover:text-[#e6edf3] text-[#8b949e] transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day) => (
          <div key={day} className="text-center text-[11px] font-black text-[#8b949e] uppercase tracking-[0.2em] py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 border-t border-l border-[#30363d]">
        {allDays.map((d, i) => {
          const formattedDate = format(d, 'yyyy-MM-dd');
          const dayEvents = events.filter(e => e.date === formattedDate);
          const isCurrentMonth = isSameMonth(d, monthStart);
          const isSelected = isSameDay(d, selectedDate);
          const isTodayDate = isToday(d);

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(d)}
              className={`min-h-[140px] p-3 border-r border-b border-[#30363d] transition-all cursor-pointer relative group ${
                !isCurrentMonth ? 'bg-[#0d1117]/30' : 'bg-[#0d1117]'
              } ${isSelected ? 'ring-2 ring-inset ring-[#58a6ff]/50 bg-[#161b22]' : 'hover:bg-[#161b22]/50'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[14px] font-bold ${
                  isTodayDate 
                    ? 'w-7 h-7 bg-[#58a6ff] text-[#0d1117] rounded-full flex items-center justify-center' 
                    : isCurrentMonth ? 'text-[#e6edf3]' : 'text-[#8b949e] opacity-40'
                }`}>
                  {format(d, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div 
                    key={idx} 
                    className={`text-[10px] px-2 py-1 rounded-[4px] truncate flex items-center gap-1.5 ${
                      event.type === 'habit' 
                        ? 'bg-[#2ea043]/10 text-[#39d353] border border-[#2ea043]/20' 
                        : 'bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${event.type === 'habit' ? 'bg-[#39d353]' : 'bg-[#58a6ff]'}`} />
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-[#8b949e] font-bold pl-1">
                    + {dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSidebar = () => {
    return (
      <div className="w-[380px] border-l border-[#ffffff0a] bg-[#0d1117] flex flex-col">
        <div className="p-8 pb-4">
          <h3 className="text-[16px] font-bold text-[#ffffff]">
            Upcoming Tasks
          </h3>
          <p className="text-[#8b949e] text-[12px] mt-1">
            {format(selectedDate, 'EEEE, MMM d')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <div className="space-y-6">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.slice(0, 3).map((task: any) => (
                  <div key={task.id}>
                    <p className="text-[#8b949e] text-[10px] font-bold uppercase tracking-wider mb-2">
                      {task.due_date ? format(new Date(task.due_date), 'hh:mm a') : 'No time'}
                    </p>
                    <div className={`bg-[#161b22] rounded-[10px] p-4 group hover:border-[#ffffff1a] transition-all border ${task.is_completed ? 'border-[#39d353]/30' : 'border-[#ffffff0a]'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-[#ffffff] text-[14px] font-bold">{task.title}</h4>
                        {task.is_completed && (
                          <div className="w-4 h-4 rounded-full bg-[#39d353] flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-[#161b22]" />
                          </div>
                        )}
                      </div>
                      {task.category && (
                        <span className="text-[#8b949e] text-[9px] font-medium bg-[#2d3449] opacity-80 px-2 py-0.5 rounded-[4px]">{task.category}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#8b949e] text-[12px]">No upcoming tasks</p>
              )}

              {/* Cover image area */}
              <div className="pt-4">
                 <div className="rounded-[12px] overflow-hidden relative group">
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0b101a] via-transparent to-transparent z-10" />
                   <div className="w-full h-[120px] bg-[#222a3d] opacity-50" />
                   <p className="absolute bottom-4 left-4 right-4 text-[#c7c4d7] text-[12px] font-medium z-20">"Consistency is the mother of mastery."</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-6">
          <button className="w-full bg-[#2d3449] hover:bg-[#3b434b] text-[#e6edf3] font-medium py-3 rounded-[8px] flex items-center justify-center gap-2 transition-all active:scale-95 text-[14px]">
            <CalendarIcon className="w-4 h-4" />
            <span>Plan Tomorrow</span>
          </button>
        </div>
      </div>
    );
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#0d1117]">
        <div className="w-8 h-8 border-3 border-[#58a6ff]/20 border-t-[#58a6ff] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {renderHeader()}
        <div className="bg-[#11141d] border border-[#ffffff0a] rounded-[16px] overflow-hidden shadow-2xl">
          {renderDays()}
          {renderCells()}
        </div>
        
        {/* Bottom 3 Stat Cards below Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
           <div className="bg-[#11141d] rounded-[16px] p-6 border border-[#ffffff0a]">
              <h4 className="text-[#8b949e] text-[10px] font-bold uppercase tracking-wider mb-2">Focus Score</h4>
              <div className="flex items-end gap-2">
                 <span className="text-[32px] font-bold text-[#ffffff] leading-none">{calendarStats?.focus_score || 0}%</span>
                 <span className={`text-[12px] font-medium mb-1 ${(calendarStats?.focus_change || 0) >= 0 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>
                   {(calendarStats?.focus_change || 0) >= 0 ? '+' : ''}{calendarStats?.focus_change || 0}% vs last month
                 </span>
              </div>
           </div>
           
           <div className="bg-[#11141d] rounded-[16px] p-6 border border-[#ffffff0a]">
              <h4 className="text-[#8b949e] text-[10px] font-bold uppercase tracking-wider mb-2">Top Habit</h4>
              <div className="flex items-center gap-3 mt-1">
                 <div className="w-8 h-8 rounded-full bg-[#2ea043]/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-[#39d353]" />
                 </div>
                 <div>
                    <h5 className="text-[#ffffff] text-[14px] font-bold">{calendarStats?.top_habit?.name || 'No habits'}</h5>
                    <p className="text-[#8b949e] text-[11px]">
                      {calendarStats?.top_habit?.completions || 0}/{calendarStats?.top_habit?.total_days || 0} days completed
                    </p>
                 </div>
              </div>
           </div>
           
           <div className="bg-[#7d79ff] rounded-[16px] p-6 shadow-lg">
              <h4 className="text-[#e6edf3] text-[10px] font-bold uppercase tracking-wider opacity-80 mb-2">Current Streak</h4>
              <div className="flex items-end gap-2">
                 <span className="text-[32px] font-bold text-[#ffffff] leading-none">{calendarStats?.current_streak || 0}</span>
                 <span className="text-[#e6edf3] opacity-80 text-[12px] font-medium mb-1">Days in a row</span>
              </div>
           </div>
        </div>
      </div>
      {renderSidebar()}
    </div>
  );
}
