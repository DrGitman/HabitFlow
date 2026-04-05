import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
  startOfToday,
  addDays as addDaysFn
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  X, 
  Zap, 
  Target, 
  RotateCcw 
} from 'lucide-react';

interface CalendarEvent {
  id: number;
  type: 'task' | 'habit';
  title: string;
  date: string;
  is_completed: boolean;
  priority?: string;
  category?: string;
  description?: string;
  scheduled_time?: string;
}

// Plan Now Modal Component
function PlanNowModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: (items: any[], date: string) => void }) {
  const [step, setStep] = useState<'select-date' | 'select-items' | 'preview'>('select-date');
  const [selectedDate, setSelectedDate] = useState<string>(format(startOfToday(), 'yyyy-MM-dd'));
  const [unscheduledItems, setUnscheduledItems] = useState<any>({ tasks: [], habits: [] });
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [scheduleTime, setScheduleTime] = useState({ start: '09:00', end: '18:00' });

  const dateOptions = [
    { label: 'Today', date: format(startOfToday(), 'yyyy-MM-dd') },
    { label: 'Tomorrow', date: format(addDaysFn(startOfToday(), 1), 'yyyy-MM-dd') },
    { label: 'Custom', date: 'custom' }
  ];

  const fetchUnscheduled = async () => {
    setLoading(true);
    try {
      const data = await api.getUnscheduledItems(selectedDate);
      setUnscheduledItems(data as any);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDateSelect = (date: string) => {
    if (date === 'custom') {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = selectedDate;
      input.showPicker?.();
      input.onchange = (e: any) => {
        if (e.target.value) {
          setSelectedDate(e.target.value);
        }
      };
      input.click();
    } else {
      setSelectedDate(date);
    }
  };

  const handleNext = () => {
    if (step === 'select-date') {
      fetchUnscheduled();
      setStep('select-items');
    } else if (step === 'select-items') {
      if (autoSchedule) {
        generateAutoSchedule();
      } else {
        setStep('preview');
      }
    }
  };

  const generateAutoSchedule = async () => {
    setLoading(true);
    try {
      const data = await api.autoSchedule({
        scheduled_date: selectedDate,
        task_ids: selectedTasks,
        habit_ids: selectedHabits,
        start_time: scheduleTime.start,
        end_time: scheduleTime.end,
        slot_duration: 30
      });
      setSuggestions((data as any).suggestions || []);
      setStep('preview');
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleConfirm = () => {
    const items = [
      ...selectedTasks.map(id => ({ item_type: 'task', item_id: id, scheduled_date: selectedDate, duration_minutes: 30, scheduled_time: undefined })),
      ...selectedHabits.map(id => ({ item_type: 'habit', item_id: id, scheduled_date: selectedDate, duration_minutes: 15, scheduled_time: undefined }))
    ];
    
    if (autoSchedule && suggestions.length > 0) {
      items.forEach((item, i) => {
        if (suggestions[i]) {
          item.scheduled_time = suggestions[i].scheduled_time;
          item.duration_minutes = suggestions[i].duration_minutes;
        }
      });
    }
    
    onConfirm(items, selectedDate);
    onClose();
    setStep('select-date');
    setSelectedTasks([]);
    setSelectedHabits([]);
    setSuggestions([]);
  };

  const toggleTask = (id: number) => {
    setSelectedTasks(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleHabit = (id: number) => {
    setSelectedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-[20px] w-[600px] max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
          <h3 className="text-[20px] font-bold text-[#e6edf3]">Plan Your Day</h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'select-date' && (
            <div className="space-y-4">
              <p className="text-[#8b949e] text-[14px]">Which day do you want to plan?</p>
              <div className="grid grid-cols-3 gap-3">
                {dateOptions.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => handleDateSelect(opt.date)}
                    className={`p-4 rounded-[12px] border text-[14px] font-medium transition-all ${
                      selectedDate === opt.date || (opt.date === 'custom' && !dateOptions.find(d => d.date === selectedDate))
                        ? 'bg-[#7c79ff] border-[#7c79ff] text-white'
                        : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#7c79ff]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#0d1117] text-[#dae2fd] px-4 py-3 rounded-[12px] border border-[#30363d] focus:border-[#7d79ff] focus:ring-1 focus:ring-[#7d79ff] outline-none transition-all text-[14px]"
              />
            </div>
          )}

          {step === 'select-items' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[#8b949e] text-[14px]">
                  {format(new Date(selectedDate), 'EEEE, MMM d')}
                </p>
                <label className="flex items-center gap-2 text-[14px] text-[#8b949e] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoSchedule} 
                    onChange={(e) => setAutoSchedule(e.target.checked)}
                    className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] accent-[#7d79ff] cursor-pointer"
                  />
                  Auto-schedule
                </label>
              </div>

              {autoSchedule && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] text-[#8b949e] uppercase tracking-wider">Start</label>
                    <input 
                      type="time" 
                      value={scheduleTime.start}
                      onChange={(e) => setScheduleTime({...scheduleTime, start: e.target.value})}
                      className="w-full bg-[#0d1117] text-[#dae2fd] px-3 py-2 rounded-[8px] border border-[#ffffff0a] focus:border-[#7d79ff] focus:ring-1 focus:ring-[#7d79ff] outline-none transition-all text-[14px]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-[#8b949e] uppercase tracking-wider">End</label>
                    <input 
                      type="time" 
                      value={scheduleTime.end}
                      onChange={(e) => setScheduleTime({...scheduleTime, end: e.target.value})}
                      className="w-full bg-[#0d1117] text-[#dae2fd] px-3 py-2 rounded-[8px] border border-[#ffffff0a] focus:border-[#7d79ff] focus:ring-1 focus:ring-[#7d79ff] outline-none transition-all text-[14px]"
                    />
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-[#7c79ff]/20 border-t-[#7c79ff] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {(unscheduledItems.tasks as any[])?.length > 0 && (
                    <div>
                      <p className="text-[12px] text-[#8b949e] uppercase tracking-wider mb-3">Tasks</p>
                      <div className="space-y-2">
                        {(unscheduledItems.tasks as any[]).map((task: any) => (
                          <div 
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className={`flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer transition-all ${
                              selectedTasks.includes(task.id)
                                ? 'bg-[#7c79ff]/10 border-[#7c79ff]'
                                : 'bg-[#0d1117] border-[#30363d] hover:border-[#7c79ff]'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border ${
                              selectedTasks.includes(task.id) ? 'bg-[#7c79ff] border-[#7c79ff]' : 'border-[#8b949e]'
                            }`} />
                            <div className="flex-1">
                              <p className="text-[#e6edf3] text-[14px]">{task.title}</p>
                              <p className="text-[#8b949e] text-[11px]">{task.priority} priority</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(unscheduledItems.habits as any[])?.length > 0 && (
                    <div>
                      <p className="text-[12px] text-[#8b949e] uppercase tracking-wider mb-3">Daily Habits</p>
                      <div className="space-y-2">
                        {(unscheduledItems.habits as any[]).map((habit: any) => (
                          <div 
                            key={habit.id}
                            onClick={() => toggleHabit(habit.id)}
                            className={`flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer transition-all ${
                              selectedHabits.includes(habit.id)
                                ? 'bg-[#39d353]/10 border-[#39d353]'
                                : 'bg-[#0d1117] border-[#30363d] hover:border-[#39d353]'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border ${
                              selectedHabits.includes(habit.id) ? 'bg-[#39d353] border-[#39d353]' : 'border-[#8b949e]'
                            }`} />
                            <div className="flex-1">
                              <p className="text-[#e6edf3] text-[14px]">{habit.name}</p>
                              <p className="text-[#8b949e] text-[11px]">{habit.frequency}</p>
                            </div>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habit.color || '#39d353' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {((unscheduledItems.tasks as any[])?.length === 0 && (unscheduledItems.habits as any[])?.length === 0) && (
                    <p className="text-center text-[#8b949e] py-4">No unscheduled items for this day</p>
                  )}
                </>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-[#8b949e] text-[14px]">
                Schedule Preview - {format(new Date(selectedDate), 'EEEE, MMM d')}
              </p>

              <div className="space-y-2">
                {(autoSchedule ? suggestions : [
                  ...selectedTasks.map(id => {
                    const task = (unscheduledItems.tasks as any[])?.find((t: any) => t.id === id);
                    return task ? { type: 'task', ...task } : null;
                  }),
                  ...selectedHabits.map(id => {
                    const habit = (unscheduledItems.habits as any[])?.find((h: any) => h.id === id);
                    return habit ? { type: 'habit', ...habit } : null;
                  })
                ]).filter(Boolean).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-[10px] border border-[#30363d]">
                    <div className={`w-2 h-2 rounded-full ${item.type === 'task' ? 'bg-[#58a6ff]' : 'bg-[#39d353]'}`} />
                    <span className="text-[#8b949e] text-[12px] w-16">
                      {item.scheduled_time || 'No time'}
                    </span>
                    <div className="flex-1">
                      <p className="text-[#e6edf3] text-[14px]">{item.title}</p>
                      <p className="text-[#8b949e] text-[11px]">{item.duration_minutes || 30} min</p>
                    </div>
                  </div>
                ))}
              </div>

              {((autoSchedule ? suggestions : []).length === 0 && selectedTasks.length === 0 && selectedHabits.length === 0) && (
                <p className="text-center text-[#8b949e] py-4">No items selected</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between p-6 border-t border-[#30363d]">
          {step === 'select-items' && (
            <button onClick={() => setStep('select-date')} className="text-[#8b949e] text-[14px] font-medium">Back</button>
          )}
          {step === 'preview' && (
            <button onClick={() => setStep('select-items')} className="text-[#8b949e] text-[14px] font-medium">Back</button>
          )}
          {step === 'select-date' && <div />}

          {step !== 'select-date' && (
            <button 
              onClick={step === 'preview' ? handleConfirm : handleNext}
              disabled={(selectedTasks.length === 0 && selectedHabits.length === 0) || loading}
              className="bg-[#7c79ff] hover:bg-[#6d69f0] disabled:opacity-50 text-white px-6 py-2 rounded-[10px] font-medium"
            >
              {step === 'preview' ? 'Confirm Schedule' : 'Next'}
            </button>
          )}
          {step === 'select-date' && (
            <button onClick={handleNext} className="bg-[#7c79ff] hover:bg-[#6d69f0] text-white px-6 py-2 rounded-[10px] font-medium">Next</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Event Detail Modal Component
function EventDetailModal({ event, isOpen, onClose }: { event: CalendarEvent | null, isOpen: boolean, onClose: () => void }) {
  const navigate = useNavigate();
  if (!isOpen || !event) return null;

  const handleGoToItem = () => {
    navigate('/actions', { state: { highlightId: event.id, type: event.type } });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[24px] w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              event.type === 'task' ? 'bg-[#58a6ff]/20 text-[#58a6ff]' : 'bg-[#39d353]/20 text-[#39d353]'
            }`}>
              {event.type}
            </div>
            <button onClick={onClose} className="text-[#8b949e] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-[#ffffff] text-[22px] font-bold leading-tight mb-2">{event.title}</h3>
          
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-3 text-[#8b949e]">
              <Clock className="w-4 h-4" />
              <span className="text-[14px]">{format(new Date(event.date), 'EEEE, MMMM do')}</span>
              {event.scheduled_time && <span className="text-[#e6edf3] font-bold ml-1">@ {event.scheduled_time}</span>}
            </div>

            {event.priority && (
              <div className="flex items-center gap-3 text-[#8b949e]">
                <Zap className="w-4 h-4" />
                <span className="text-[14px] capitalize">{event.priority} Priority</span>
              </div>
            )}

            {event.category && (
              <div className="flex items-center gap-3 text-[#8b949e]">
                <Target className="w-4 h-4" />
                <span className="text-[14px]">{event.category}</span>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-3">
             <button 
               onClick={handleGoToItem}
               className="w-full bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold py-3.5 rounded-[12px] transition-all flex items-center justify-center gap-2"
             >
               Go to Item
             </button>
             <button 
               onClick={onClose}
               className="w-full bg-transparent hover:bg-[#ffffff05] text-[#8b949e] font-bold py-3.5 rounded-[12px] transition-all"
             >
               Close
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [calendarStats, setCalendarStats] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchCalendarData();
    fetchUpcomingTasks();
    fetchCalendarStats();
    fetchScheduledItems();
  }, [currentMonth]);

  const fetchScheduledItems = async () => {
    try {
      const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
      const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');
      const data = await api.getScheduledItems(start, end);
      setScheduledItems(data as any[]);
    } catch (e) { console.error(e); }
  };

  const handlePlanConfirm = async (items: any[], date: string) => {
    try {
      await api.confirmScheduledItems(items);
      fetchScheduledItems();
    } catch (e) { console.error(e); }
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const start = format(startOfWeek(startOfMonth(currentMonth)), 'yyyy-MM-dd');
      const end = format(endOfWeek(endOfMonth(currentMonth)), 'yyyy-MM-dd');
      const response: any = await api.getCalendarData(start, end);
      
      let fetchedEvents: CalendarEvent[] = [];
      if (response && response.tasks) {
        const taskEvents = (response.tasks || []).map((task: any) => ({
          id: task.id,
          type: 'task' as const,
          title: task.title,
          date: task.due_date,
          is_completed: task.is_completed,
          priority: task.priority
        }));
        const habitEvents = (response.completions || []).map((c: any) => ({
          id: c.id,
          type: 'habit' as const,
          title: c.name,
          date: c.completion_date,
          is_completed: true,
          category: c.category,
          description: c.description
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
        <h2 className="text-[20px] font-bold text-[#ffffff] tracking-tight">Monthly Planner</h2>
        <div className="flex bg-[#161b22] border border-[#ffffff0a] rounded-[24px] p-1">
          {(['Day', 'Week', 'Month'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v.toLowerCase() as any)}
              className={`px-4 py-1.5 text-[12px] font-bold capitalize tracking-wide rounded-[20px] transition-all ${
                view === v.toLowerCase() ? 'bg-[#30363d] text-[#ffffff]' : 'text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="p-1 hover:text-[#e6edf3] text-[#8b949e]"><ChevronLeft className="w-5 h-5" /></button>
        <span className="text-[14px] font-medium text-[#ffffff]">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={nextMonth} className="p-1 hover:text-[#e6edf3] text-[#8b949e]"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day) => (
          <div key={day} className="text-center text-[11px] font-black text-[#8b949e] uppercase tracking-[0.2em] py-2">{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 border-t border-l border-[#30363d]">
        {allDays.map((d, i) => {
          const formattedDate = format(d, 'yyyy-MM-dd');
          const dayEvents = events.filter(e => e.date === formattedDate);
          const dayScheduled = scheduledItems.filter(s => s.scheduled_date === formattedDate && s.is_confirmed).map(s => ({
            id: s.id,
            type: s.item_type,
            title: s.title,
            date: s.scheduled_date,
            is_completed: false,
            scheduled_time: s.scheduled_time,
            priority: 'scheduled'
          }));
          const allDayEvents = [...dayEvents, ...dayScheduled];
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
                <span className={`text-[14px] font-bold ${isTodayDate ? 'w-7 h-7 bg-[#58a6ff] text-[#0d1117] rounded-full flex items-center justify-center' : isCurrentMonth ? 'text-[#e6edf3]' : 'text-[#8b949e] opacity-40'}`}>{format(d, 'd')}</span>
                {allDayEvents.length > 0 && <span className="text-[10px] font-bold text-[#8b949e] bg-[#21262d] px-1.5 py-0.5 rounded-[4px] opacity-0 group-hover:opacity-100">{allDayEvents.length}</span>}
              </div>
              <div className="space-y-1 overflow-hidden">
                {allDayEvents.slice(0, 3).map((event, idx) => (
                  <div 
                    key={idx} 
                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(event as any); setIsDetailModalOpen(true); }}
                    className={`text-[10px] px-2 py-1 rounded-[4px] truncate flex items-center gap-1.5 transition-transform hover:scale-[1.02] ${
                      event.priority === 'scheduled' ? 'bg-[#f85149]/10 text-[#f85149] border border-[#f85149]/20' : 
                      event.type === 'habit' ? 'bg-[#2ea043]/10 text-[#39d353] border border-[#2ea043]/20' : 'bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${event.priority === 'scheduled' ? 'bg-[#f85149]' : event.type === 'habit' ? 'bg-[#39d353]' : 'bg-[#58a6ff]'}`} />
                    {event.title}
                    {event.scheduled_time && <span className="opacity-70 ml-1">{event.scheduled_time}</span>}
                  </div>
                ))}
                {allDayEvents.length > 3 && <div className="text-[9px] text-[#8b949e] font-bold pl-1">+ {allDayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentMonth);
    const days = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
    return (
      <div className="grid grid-cols-7 h-full border-t border-l border-[#30363d]">
        {days.map((d, i) => {
          const formattedDate = format(d, 'yyyy-MM-dd');
          const dayEvents = [...events, ...scheduledItems.map(s => ({ ...s, type: s.item_type, date: s.scheduled_date, priority: 'scheduled' }))].filter(e => e.date === formattedDate);
          return (
            <div key={i} className={`flex-1 border-r border-[#30363d] p-4 bg-[#0d1117] ${isToday(d) ? 'bg-[#161b22]' : ''}`}>
               <div className="text-center mb-6">
                 <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-widest">{format(d, 'EEE')}</p>
                 <p className={`text-[18px] font-bold mt-1 ${isToday(d) ? 'text-[#7c79ff]' : 'text-[#e6edf3]'}`}>{format(d, 'd')}</p>
               </div>
               <div className="space-y-3">
                  {dayEvents.map((event, idx) => (
                    <div key={idx} onClick={() => { setSelectedEvent(event as any); setIsDetailModalOpen(true); }} className={`p-3 rounded-[12px] border cursor-pointer transition-all hover:translate-y-[-2px] ${event.priority === 'scheduled' ? 'bg-[#f85149]/10 border-[#f85149]/20' : event.type === 'habit' ? 'bg-[#39d353]/10 border-[#39d353]/20' : 'bg-[#58a6ff]/10 border-[#58a6ff]/20'}`}>
                      <p className="text-[12px] font-bold text-[#e6edf3] mb-1">{event.title}</p>
                      {event.scheduled_time && <p className="text-[10px] text-[#8b949e]">{event.scheduled_time}</p>}
                    </div>
                  ))}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const dayEvents = [...events, ...scheduledItems.map(s => ({ ...s, type: s.item_type, date: s.scheduled_date, priority: 'scheduled' }))].filter(e => e.date === formattedDate);
    return (
      <div className="flex flex-col h-full bg-[#0d1117] p-8">
        <div className="mb-8">
          <h3 className="text-[24px] font-bold text-[#e6edf3]">{format(selectedDate, 'EEEE, MMMM do')}</h3>
          <p className="text-[#8b949e] text-[14px]">You have {dayEvents.length} items planned for today</p>
        </div>
        <div className="space-y-4 max-w-2xl">
          {dayEvents.length > 0 ? dayEvents.map((event, idx) => (
            <div key={idx} onClick={() => { setSelectedEvent(event as any); setIsDetailModalOpen(true); }} className={`p-6 rounded-[20px] border flex items-center justify-between cursor-pointer transition-all hover:bg-[#161b22] ${event.priority === 'scheduled' ? 'bg-[#f85149]/5 border-[#f85149]/20' : event.type === 'habit' ? 'bg-[#39d353]/5 border-[#39d353]/20' : 'bg-[#58a6ff]/5 border-[#58a6ff]/20'}`}>
              <div className="flex items-center gap-5">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center ${event.type === 'habit' ? 'bg-[#39d353]/10 text-[#39d353]' : 'bg-[#58a6ff]/10 text-[#58a6ff]'}`}>
                    {event.type === 'habit' ? <RotateCcw className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                 </div>
                 <div>
                   <h4 className="text-[#e6edf3] text-[16px] font-bold">{event.title}</h4>
                   <p className="text-[#8b949e] text-[12px]">{event.scheduled_time || 'No specific time'}</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#30363d]" />
            </div>
          )) : (
            <div className="py-20 text-center opacity-40">
               <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-[#8b949e]" />
               <p className="text-[#8b949e] text-[16px] font-medium">Nothing scheduled for this day</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <div className="w-[380px] border-l border-[#ffffff0a] bg-[#0d1117] flex flex-col">
      <div className="p-8 pb-4">
        <h3 className="text-[16px] font-bold text-[#ffffff]">Upcoming Tasks</h3>
        <p className="text-[#8b949e] text-[12px] mt-1">{format(selectedDate, 'EEEE, MMM d')}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {upcomingTasks.length > 0 ? upcomingTasks.slice(0, 3).map((task: any) => (
          <div key={task.id}>
            <p className="text-[#8b949e] text-[10px] font-bold uppercase tracking-wider mb-2">{task.due_date ? format(new Date(task.due_date), 'hh:mm a') : 'No time'}</p>
            <div className={`bg-[#161b22] rounded-[10px] p-4 group hover:border-[#ffffff1a] transition-all border ${task.is_completed ? 'border-[#39d353]/30' : 'border-[#ffffff0a]'}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-[#ffffff] text-[14px] font-bold">{task.title}</h4>
                {task.is_completed && <CheckCircle2 className="w-4 h-4 text-[#39d353]" />}
              </div>
              {task.category && <span className="text-[#8b949e] text-[9px] font-medium bg-[#2d3449] px-2 py-0.5 rounded-[4px]">{task.category}</span>}
            </div>
          </div>
        )) : <p className="text-[#8b949e] text-[12px]">No upcoming tasks</p>}
        <div className="pt-4"><div className="rounded-[12px] overflow-hidden relative group"><div className="absolute inset-0 bg-gradient-to-t from-[#0b101a] via-transparent to-transparent z-10" /><div className="w-full h-[120px] bg-[#222a3d] opacity-50" /><p className="absolute bottom-4 left-4 right-4 text-[#c7c4d7] text-[12px] font-medium z-20">"Consistency is the mother of mastery."</p></div></div>
      </div>
      <div className="p-6">
        <button onClick={() => setShowPlanModal(true)} className="w-full bg-[#2d3449] hover:bg-[#3b434b] text-[#e6edf3] font-medium py-3 rounded-[8px] flex items-center justify-center gap-2"><CalendarIcon className="w-4 h-4 text-[#7d79ff]" /><span>Plan Now</span></button>
      </div>
    </div>
  );

  const planningModal = <PlanNowModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} onConfirm={handlePlanConfirm} />;

  if (loading && events.length === 0) return <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#0d1117]"><div className="w-8 h-8 border-3 border-[#58a6ff]/20 border-t-[#58a6ff] rounded-full animate-spin" /></div>;

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {renderHeader()}
        <div className="bg-[#11141d] border border-[#ffffff0a] rounded-[16px] overflow-hidden shadow-2xl h-full">
          {view === 'month' && <>{renderDays()}{renderCells()}</>}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
           <div className="bg-[#11141d] rounded-[16px] p-6 border border-[#ffffff0a]"><h4 className="text-[#8b949e] text-[10px] font-bold uppercase tracking-wider mb-2">Focus Score</h4><div className="flex items-end gap-2"><span className="text-[32px] font-bold text-[#ffffff] leading-none">{calendarStats?.focus_score || 0}%</span><span className={`text-[12px] font-medium mb-1 ${(calendarStats?.focus_change || 0) >= 0 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>{(calendarStats?.focus_change || 0) >= 0 ? '+' : ''}{calendarStats?.focus_change || 0}% vs last month</span></div></div>
           <div className="bg-[#11141d] rounded-[16px] p-6 border border-[#ffffff0a]"><h4 className="text-[#8b949e] text-[10px] font-bold uppercase tracking-wider mb-2">Top Habit</h4><div className="flex items-center gap-3 mt-1"><div className="w-8 h-8 rounded-full bg-[#2ea043]/20 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-[#39d353]" /></div><div><h5 className="text-[#ffffff] text-[14px] font-bold">{calendarStats?.top_habit?.name || 'No habits'}</h5><p className="text-[#8b949e] text-[11px]">{calendarStats?.top_habit?.completions || 0}/{calendarStats?.top_habit?.total_days || 0} days completed</p></div></div></div>
           <div className="bg-[#7d79ff] rounded-[16px] p-6 shadow-lg"><h4 className="text-[#e6edf3] text-[10px] font-bold uppercase tracking-wider opacity-80 mb-2">Current Streak</h4><div className="flex items-end gap-2"><span className="text-[32px] font-bold text-[#ffffff] leading-none">{calendarStats?.current_streak || 0}</span><span className="text-[#e6edf3] opacity-80 text-[12px] font-medium mb-1">Days in a row</span></div></div>
        </div>
       </div>
      {renderSidebar()}
      {planningModal}
      <EventDetailModal event={selectedEvent} isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} />
    </div>
  );
}
