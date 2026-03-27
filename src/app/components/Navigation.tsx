import { Link, useLocation } from 'react-router';
import { Home, CheckSquare, Flame, BarChart3, LogOut, Calendar, User, Settings, Bell, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const profileItems = [
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-[#080b12] border-r border-[#ffffff0a] flex flex-col z-50">
      {/* Logo */}
      <div className="p-8 mb-4">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/src/assets/logo.png" alt="Logo" className="w-8 h-8 brightness-200 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col">
            <h1 className="font-['Inter'] font-black text-[#ffffff] text-[18px] tracking-[0.1em] leading-none uppercase">HabitFlow</h1>
            <p className="font-['Inter'] text-[#8b949e] text-[9px] mt-1 uppercase tracking-[0.15em] opacity-60">Habit Architect</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all group ${
                isActive
                  ? 'bg-[#161b22] text-[#e6edf3] border border-[#ffffff0a] shadow-lg shadow-black/20'
                  : 'text-[#8b949e] hover:bg-[#11141d] hover:text-[#e6edf3]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#7c79ff]' : 'group-hover:text-[#7c79ff]'}`} />
              <span className="font-['Inter'] font-bold text-[13px] tracking-tight">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1 h-3 bg-[#7c79ff] rounded-full shadow-[0_0_8px_rgba(124,121,255,0.5)]" />
              )}
            </Link>
          );
        })}

        <div className="my-6 mx-4 border-t border-[#ffffff0a] opacity-30" />

        {profileItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all group ${
                isActive
                  ? 'bg-[#161b22] text-[#e6edf3] border border-[#ffffff0a]'
                  : 'text-[#8b949e] hover:bg-[#11141d] hover:text-[#e6edf3]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#7c79ff]' : 'group-hover:text-[#7c79ff]'}`} />
              <span className="font-['Inter'] font-bold text-[13px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-6 space-y-4">
        <button
          className="w-full bg-gradient-to-r from-[#8e8cf7] to-[#6d69f0] hover:from-[#7c79ff] hover:to-[#524eff] text-white font-['Inter'] font-black uppercase tracking-widest text-[11px] py-4 rounded-[12px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_12px_24px_rgba(124,121,255,0.15)]"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Commit</span>
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-5 py-3 rounded-[12px] text-[#f85149] hover:bg-[#f85149]/5 hover:border hover:border-[#f851491a] transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          <span className="font-['Inter'] font-bold text-[13px] tracking-tight">Disconnect</span>
        </button>
      </div>
    </nav>
  );
}
