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
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
      const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');
      const data = await api.getCalendarData(start, end);
      setEvents(data as CalendarEvent[]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      <div className="flex items-center gap-6">
        <h2 className="text-[28px] font-black text-[#e6edf3] tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex bg-[#161b22] border border-[#30363d] rounded-[8px] p-1">
          {(['day', 'week', 'month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-[6px] transition-all ${
                view === v 
                  ? 'bg-[#21262d] text-[#e6edf3] shadow-sm' 
                  : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={prevMonth}
          className="p-2 bg-[#161b22] border border-[#30363d] rounded-[8px] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#58a6ff]/50 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setCurrentMonth(new Date())}
          className="px-4 py-2 bg-[#161b22] border border-[#30363d] rounded-[8px] text-[13px] font-bold text-[#e6edf3] hover:border-[#58a6ff]/50 transition-all"
        >
          Today
        </button>
        <button 
          onClick={nextMonth}
          className="p-2 bg-[#161b22] border border-[#30363d] rounded-[8px] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#58a6ff]/50 transition-all"
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
    const selectedEvents = events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'));
    
    return (
      <div className="w-[380px] border-l border-[#30363d] bg-[#0d1117] flex flex-col">
        <div className="p-8 border-b border-[#30363d]">
          <p className="text-[#8b949e] text-[11px] font-black uppercase tracking-[0.2em] mb-2">
            Schedule for
          </p>
          <h3 className="text-[24px] font-black text-[#e6edf3]">
            {format(selectedDate, 'EEEE')}
          </h3>
          <p className="text-[#8b949e] text-[14px]">
            {format(selectedDate, 'MMMM do, yyyy')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {selectedEvents.length > 0 ? (
            <>
              {/* Habits Section */}
              <div>
                <h4 className="text-[11px] font-black text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock className="w-3 h-3 text-[#39d353]" /> Active Habits
                </h4>
                <div className="space-y-3">
                  {selectedEvents.filter(e => e.type === 'habit').map(event => (
                    <div key={event.id} className="bg-[#161b22] border border-[#30363d] rounded-[10px] p-4 flex items-center justify-between group hover:border-[#39d353]/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${event.is_completed ? 'bg-[#2ea043] border-[#2ea043]' : 'border-[#30363d] group-hover:border-[#39d353]'}`}>
                          {event.is_completed && <CheckCircle2 className="w-3.5 h-3.5 text-[#0d1117]" />}
                        </div>
                        <span className={`text-[14px] font-medium ${event.is_completed ? 'text-[#8b949e] line-through' : 'text-[#e6edf3]'}`}>
                          {event.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks Section */}
              <div>
                <h4 className="text-[11px] font-black text-[#8b949e] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-[#58a6ff]" /> Upcoming Tasks
                </h4>
                <div className="space-y-3">
                  {selectedEvents.filter(e => e.type === 'task').map(event => (
                    <div key={event.id} className="bg-[#161b22] border border-[#30363d] rounded-[10px] p-4 group hover:border-[#58a6ff]/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[14px] font-medium ${event.is_completed ? 'text-[#8b949e] line-through' : 'text-[#e6edf3]'}`}>
                          {event.title}
                        </span>
                        <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${event.is_completed ? 'bg-[#58a6ff] border-[#58a6ff]' : 'border-[#30363d] group-hover:border-[#58a6ff]'}`}>
                          {event.is_completed && <CheckCircle2 className="w-3.5 h-3.5 text-[#0d1117]" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider ${
                          event.priority === 'high' ? 'bg-[#f85149]/10 text-[#f85149]' : 
                          event.priority === 'medium' ? 'bg-[#d29922]/10 text-[#d29922]' : 
                          'bg-[#30363d] text-[#8b949e]'
                        }`}>
                          {event.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-12">
              <div className="w-16 h-16 bg-[#161b22] rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-[#8b949e]" />
              </div>
              <p className="text-[14px] font-medium text-[#8b949e]">Quiet day ahead.</p>
              <p className="text-[12px] text-[#8b949e]">Perfect for some focused deep work.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-[#010409]">
          <button className="w-full bg-[#58a6ff] hover:bg-[#4a9eff] text-[#0d1117] font-bold py-3.5 rounded-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#58a6ff]/10 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-[12px] overflow-hidden shadow-2xl">
          {renderDays()}
          {renderCells()}
        </div>
      </div>
      {renderSidebar()}
    </div>
  );
}
