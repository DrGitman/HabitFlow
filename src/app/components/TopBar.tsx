import { useState, useEffect } from 'react';
import { Search, Bell, User, CheckSquare, Activity, Target, X, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate, Link } from 'react-router';

export default function TopBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const hasUnread = notifications.length > 0;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getUnreadNotifications();
      setNotifications(data as any[]);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults(null);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    setShowResults(true);
    try {
      const results = await api.globalSearch(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="h-20 border-b border-[#ffffff0a] bg-[#080b12]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
      {/* Search Bar */}
      <div className="flex-1 max-w-md relative">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e] group-focus-within:text-[#7c79ff] transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for tasks, habits, goals..."
            className="w-full bg-[#11141d] border border-[#ffffff0a] rounded-[12px] py-2.5 pl-10 pr-10 text-[#e6edf3] text-[13px] focus:outline-none focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 transition-all font-medium placeholder:opacity-50"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-[#11141d] border border-[#ffffff0a] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
            {isSearching ? (
              <div className="p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-[#7c79ff] animate-spin" />
                <p className="text-[#8b949e] text-[10px] font-black tracking-[0.2em] uppercase">Analyzing Matrix...</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <div className="p-3 space-y-4">
                  {/* Tasks Section */}
                  {(searchResults?.tasks?.length > 0) && (
                    <div className="space-y-1">
                      <p className="px-3 py-1.5 text-[9px] font-black text-[#8b949e] uppercase tracking-[0.2em] opacity-60">Tasks</p>
                      {searchResults.tasks.slice(0, 3).map((task: any) => (
                        <button 
                          key={task.id}
                          onClick={() => { navigate('/actions', { state: { highlightId: task.id, type: 'task' } }); setShowResults(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#161b22] rounded-[10px] transition-colors text-left group"
                        >
                          <CheckSquare className="w-4 h-4 text-[#7c79ff]" />
                          <span className="text-[13px] text-[#e6edf3] font-bold truncate group-hover:text-[#7c79ff]">{task.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Goals Section */}
                  {(searchResults?.goals?.length > 0) && (
                    <div className="space-y-1 border-t border-[#ffffff05] pt-3">
                      <p className="px-3 py-1.5 text-[9px] font-black text-[#8b949e] uppercase tracking-[0.2em] opacity-60">Goals (Milestones)</p>
                      {searchResults.goals.slice(0, 3).map((goal: any) => (
                        <button 
                          key={goal.id}
                          onClick={() => { navigate('/actions', { state: { highlightId: goal.id, type: 'goal' } }); setShowResults(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#161b22] rounded-[10px] transition-colors text-left group"
                        >
                          <Target className="w-4 h-4 text-[#f85149]" />
                          <span className="text-[13px] text-[#e6edf3] font-bold truncate group-hover:text-[#f85149]">{goal.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Habits Section */}
                  {(searchResults?.habits?.length > 0) && (
                    <div className="space-y-1 border-t border-[#ffffff05] pt-3">
                      <p className="px-3 py-1.5 text-[9px] font-black text-[#8b949e] uppercase tracking-[0.2em] opacity-60">Habits</p>
                      {searchResults.habits.slice(0, 3).map((habit: any) => (
                        <button 
                          key={habit.id}
                          onClick={() => { navigate('/actions', { state: { highlightId: habit.id, type: 'habit' } }); setShowResults(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#161b22] rounded-[10px] transition-colors text-left group"
                        >
                          <Activity className="w-4 h-4 text-[#39d353]" />
                          <span className="text-[13px] text-[#e6edf3] font-bold truncate group-hover:text-[#39d353]">{habit.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        <Link to="/notifications" className="notification-button relative p-2.5 text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22] rounded-[10px] transition-all">
          <Bell className="w-4 h-4" />
          {hasUnread && (
            <span className="notification-dot absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#f85149] rounded-full border-2 border-[#080b12]" />
          )}
        </Link>

        <div className="h-6 w-px bg-[#ffffff0a]" />

        <Link to="/profile" className="flex items-center gap-4 pl-2 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-[#ffffff] text-[13px] font-black leading-tight group-hover:text-[#7c79ff] transition-colors uppercase tracking-tight">
              {user?.full_name || 'System User'}
            </p>
            <p className="text-[#8b949e] text-[9px] leading-tight font-black uppercase tracking-[0.15em] opacity-40 mt-0.5">{user?.rank || 'Habit Architect'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#11141d] border border-[#ffffff0a] flex items-center justify-center text-[#7c79ff] group-hover:border-[#7c79ff] group-hover:shadow-[0_0_15px_rgba(124,121,255,0.2)] transition-all overflow-hidden relative">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <div className="absolute inset-0 border border-[#ffffff0a] rounded-full" />
          </div>
        </Link>
      </div>
    </header>
  );
}
