import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Monitor, 
  Mail, 
  Moon,
  Shield,
  Zap,
  Clock,
  Trophy,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

interface Preferences {
  dark_mode: boolean;
  desktop_notifications: boolean;
  weekly_summary_emails: boolean;
  notification_reminders: boolean;
  notification_achievements: boolean;
  profile_visibility: string;
  anonymous_analytics: boolean;
}

const Toggle = ({ active, onClick, loading }: { active: boolean; onClick: () => void; loading?: boolean }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className="relative shrink-0 flex items-center group focus:outline-none"
  >
    <div className={`h-[24px] rounded-[9999px] w-[44px] transition-all duration-300 ${active ? 'bg-[#7c79ff]' : 'bg-[#2d3449]'}`} />
    <div className={`absolute bg-white rounded-[9999px] w-[18px] h-[18px] top-[3px] shadow-sm transition-all duration-300 ${active ? 'left-[23px]' : 'left-[3px]'}`}>
      {loading && <Loader2 className="w-full h-full p-1 text-[#7c79ff] animate-spin" />}
    </div>
  </button>
);

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const data = await api.getUserPreferences();
      setPrefs(data as Preferences);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Could not load settings');
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (key: keyof Preferences) => {
    if (!prefs) return;
    
    const newValue = !prefs[key];
    setUpdatingField(key);
    
    try {
      const updated = await api.updateUserPreferences({ [key]: newValue });
      setPrefs(updated as Preferences);
      
      // Special logic for theme
      if (key === 'dark_mode') {
        if (!newValue) document.body.classList.add('light-theme');
        else document.body.classList.remove('light-theme');
      }

      toast.success('Settings updated');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to save change');
    } finally {
      setUpdatingField(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#7c79ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Inter']">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-4">
        {/* Navigation */}
        <div className="col-span-1 flex flex-col gap-[8px] items-start self-start w-full">
          {[
            { id: 'general', label: 'General', Icon: SettingsIcon },
            { id: 'notifications', label: 'Notifications', Icon: Bell },
            { id: 'privacy', label: 'Privacy', Icon: Lock },
          ].map(({ id, label, Icon }) => (
            <button 
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] transition-all text-[14px] ${
                activeTab === id ? 'bg-[#222a3d] text-[#c2c1ff] font-semibold' : 'text-[#8b949e] hover:bg-[#222a3d]/50 font-normal hover:text-[#e6edf3]'
              }`}
            >
              <Icon className="w-[15px] h-[15px]" />
              <span className="leading-[20px]">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="col-span-3 w-full">
          {activeTab === 'general' && prefs && (
            <div className="flex flex-col gap-[32px] items-start w-full">
              <div className="flex flex-col gap-[4px] items-start w-full">
                <h2 className="text-[#dae2fd] text-[24px] font-bold tracking-tight">General Preferences</h2>
                <p className="text-[#8b949e] text-[14px] font-medium opacity-60">Configure your core application experience.</p>
              </div>

              <div className="flex flex-col gap-[16px] w-full">
                {/* Dark Mode */}
                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Moon className="w-5 h-5 text-[#7c79ff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Dark mode</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">Switch between light and dark visual themes</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.dark_mode} 
                      onClick={() => togglePreference('dark_mode')} 
                      loading={updatingField === 'dark_mode'} 
                    />
                  </div>
                </div>

                {/* Desktop Notifications */}
                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Monitor className="w-5 h-5 text-[#bc8cff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Desktop notifications</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">Receive alerts directly on your operating system</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.desktop_notifications} 
                      onClick={() => togglePreference('desktop_notifications')} 
                      loading={updatingField === 'desktop_notifications'} 
                    />
                  </div>
                </div>

                {/* Weekly Emails */}
                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Mail className="w-5 h-5 text-[#39d353]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Weekly summary emails</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">A comprehensive report of your habit streaks every Monday</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.weekly_summary_emails} 
                      onClick={() => togglePreference('weekly_summary_emails')} 
                      loading={updatingField === 'weekly_summary_emails'} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && prefs && (
             <div className="flex flex-col gap-[32px] items-start w-full">
              <div className="flex flex-col gap-[4px] items-start w-full">
                <h2 className="text-[#dae2fd] text-[24px] font-bold tracking-tight">Notification Channels</h2>
                <p className="text-[#8b949e] text-[14px] font-medium opacity-60">Manage how we contact you for internal updates.</p>
              </div>

              <div className="flex flex-col gap-[16px] w-full">
                {/* Reminders */}
                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Clock className="w-5 h-5 text-[#7c79ff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Task & Habit Reminders</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">Get nudged when your scheduled activities are due</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.notification_reminders} 
                      onClick={() => togglePreference('notification_reminders')} 
                      loading={updatingField === 'notification_reminders'} 
                    />
                  </div>
                </div>

                {/* Achievements */}
                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Trophy className="w-5 h-5 text-[#f1e05a]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Achievement Alerts</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">Notifications when you unlock new medals or milestones</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.notification_achievements} 
                      onClick={() => togglePreference('notification_achievements')} 
                      loading={updatingField === 'notification_achievements'} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && prefs && (
            <div className="flex flex-col gap-[32px] items-start w-full">
              <div className="flex flex-col gap-[4px] items-start w-full">
                <h2 className="text-[#dae2fd] text-[24px] font-bold tracking-tight">Privacy Settings</h2>
                <p className="text-[#8b949e] text-[14px] font-medium opacity-60">Manage your data exposure and profile visibility.</p>
              </div>

              <div className="flex flex-col gap-[16px] w-full">
                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Shield className="w-5 h-5 text-[#7c79ff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Profile Visibility</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">Control who can see your stats (currently {prefs.profile_visibility})</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.profile_visibility === 'public'} 
                      onClick={async () => {
                        setUpdatingField('profile_visibility');
                        try {
                          const newVis = prefs.profile_visibility === 'public' ? 'private' : 'public';
                          const updated = await api.updateUserPreferences({ profile_visibility: newVis });
                          setPrefs(updated as Preferences);
                          toast.success('Privacy updated');
                        } catch(e) {
                          toast.error('Update failed');
                        } finally { setUpdatingField(null); }
                      }} 
                      loading={updatingField === 'profile_visibility'} 
                    />
                  </div>
                </div>

                <div className="bg-[#161b22] border border-[#ffffff0a] rounded-[20px] p-6 hover:border-[#7c79ff40] transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="bg-[#1c2128] border border-[#ffffff0a] p-2.5 rounded-[12px] group-hover:border-[#7c79ff40] transition-all">
                        <Zap className="w-5 h-5 text-[#f85149]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#e6edf3] text-[15px] font-bold">Anonymous Analytics</span>
                        <span className="text-[#8b949e] text-[12px] font-medium">Help us improve by sharing completely anonymized usage data</span>
                      </div>
                    </div>
                    <Toggle 
                      active={prefs.anonymous_analytics} 
                      onClick={() => togglePreference('anonymous_analytics')} 
                      loading={updatingField === 'anonymous_analytics'} 
                    />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 border border-[#d4183d40] bg-[#d4183d0a] rounded-[20px] p-6 group">
                  <div className="flex flex-col gap-[16px]">
                    <div className="flex flex-col gap-[4px]">
                      <span className="text-[#ff7b72] text-[16px] font-bold">Danger Zone</span>
                      <span className="text-[#8b949e] text-[13px]">Irreversible and destructive actions.</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#e6edf3] text-[15px] font-medium">Delete Account</span>
                      <button
                        onClick={async () => {
                          toast.error('Delete your account permanently?', {
                            action: {
                              label: 'Delete',
                              onClick: async () => {
                                try {
                                  const token = localStorage.getItem('token');
                                  await fetch('http://localhost:5000/api/profile', {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  localStorage.removeItem('token');
                                  window.location.href = '/login';
                                } catch(e) {
                                  toast.error('Failed to delete account');
                                }
                              }
                            },
                            cancel: { label: 'Cancel', onClick: () => {} },
                            duration: 10000,
                          });
                        }}
                        className="bg-[#da3633] hover:bg-[#b32b28] text-white px-4 py-2 rounded-[8px] text-[14px] font-bold transition-all"
                      >
                        Delete everything
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
