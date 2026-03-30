import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  User as UserIcon, 
  Mail, 
  Globe, 
  Activity, 
  Award, 
  Cpu, 
  Flame, 
  CheckCircle2, 
  Zap, 
  Trophy,
  Pencil,
  Save,
  Loader2,
  Lock,
  X,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

interface UserProfile {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  rank?: string;
  timezone?: string;
  status?: string;
  created_at?: string;
}

interface AnalyticsSummary {
  completion_rate: number;
  completed_tasks: number;
}

interface Achievement {
  title: string;
  desc: string;
  type: string;
  icon: string;
  color: string;
}

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#11141d] border border-[#ffffff0a] rounded-[24px] w-full max-w-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[#ffffff0a]">
          <h3 className="text-white font-bold text-[18px]">{title}</h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  
  // Password state
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, summaryRes, achievementsRes] = await Promise.all([
        api.getProfile(),
        api.getAnalyticsSummary(),
        api.getAchievements()
      ]);

      const prof = profileRes as UserProfile;
      setProfile(prof);
      setDisplayName(prof.full_name || '');
      setEmail(prof.email || '');
      setSummary(summaryRes as AnalyticsSummary);
      setAchievements(achievementsRes as Achievement[]);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { full_name: displayName, email: email };
      if (avatarPreview) {
        payload.avatar_url = avatarPreview;
      }
      
      const updatedUser = await api.updateProfile(payload);
      setProfile(updatedUser as UserProfile);
      setUser(updatedUser as any);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      alert('Profile updated successfully!');
      setAvatarPreview(null);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    try {
      await api.changePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new
      });
      alert('Password changed successfully!');
      setIsPasswordModalOpen(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#080b12]">
        <Loader2 className="w-8 h-8 text-[#7c79ff] animate-spin" />
      </div>
    );
  }

  const joinedDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return Flame;
      case 'Zap': return Zap;
      case 'CheckCircle2': return CheckCircle2;
      case 'Award': return Award;
      default: return Trophy;
    }
  };

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Inter']">
      
      {/* 3. REMOVE DUPLICATE HEADER ICONS (Done: Removed top div) */}
      <h2 className="text-[#ffffff] text-[14px] font-black tracking-[0.2em] uppercase opacity-70 mb-2">My Profile</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Identity Card */}
        <div className="lg:col-span-2 bg-[#11141d] border border-[#ffffff0a] rounded-[24px] p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Cpu className="w-32 h-32 text-white" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            {/* 5. PROFILE PICTURE FIX (Upload logic) */}
            <div className="relative">
              <div className="w-32 h-32 rounded-[32px] bg-[#161b22] border border-[#ffffff0a] flex items-center justify-center overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-transform group-hover:scale-105 duration-500">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.email}`} alt="Avatar" className="w-full h-full object-cover grayscale opacity-80" />
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#7c79ff] border-4 border-[#11141d] flex items-center justify-center text-white shadow-lg hover:scale-110 transition-all"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            {/* Info Section */}
            <div className="flex-1 text-center md:text-left space-y-6">
              <div>
                <p className="text-[#7c79ff] text-[10px] font-black uppercase tracking-[0.2em] mb-1">{profile?.rank || 'ARCHITECT RANK'}</p>
                <h1 className="text-[#ffffff] text-[32px] font-black tracking-tight leading-none">{profile?.full_name || 'System User'}</h1>
                <p className="text-[#8b949e] text-[13px] mt-1 font-medium">{profile?.email}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                <div>
                  <p className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.15em] mb-1 opacity-50">Joined Date</p>
                  <p className="text-[#e6edf3] text-[13px] font-bold">{joinedDate}</p>
                </div>
                <div>
                  <p className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.15em] mb-1 opacity-50">Timezone</p>
                  <p className="text-[#e6edf3] text-[13px] font-bold">{profile?.timezone || 'PST (UTC-8)'}</p>
                </div>
                <div>
                  <p className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.15em] mb-1 opacity-50">Status</p>
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="w-2 h-2 rounded-full bg-[#39d353] shadow-[0_0_8px_rgba(57,211,83,0.5)]" />
                    <p className="text-[#e6edf3] text-[13px] font-bold">{profile?.status || 'Focusing'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. PROFILE UPDATE FIX (Editable fields) */}
        <div className="bg-[#11141d] border border-[#ffffff0a] rounded-[24px] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-[10px] bg-[#7c79ff]/10 border border-[#7c79ff]/20">
               <Globe className="w-4 h-4 text-[#7c79ff]" />
            </div>
            <h3 className="text-[#ffffff] text-[16px] font-bold tracking-tight">Identity Settings</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#080b12] border border-[#ffffff0a] rounded-[12px] py-3 px-4 text-[#e6edf3] text-[13px] focus:outline-none focus:border-[#7c79ff] transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#080b12] border border-[#ffffff0a] rounded-[12px] py-3 px-4 text-[#e6edf3] text-[13px] focus:outline-none focus:border-[#7c79ff] transition-all font-medium"
              />
            </div>
            
            <div className="space-y-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#161b22] hover:bg-[#1c2128] border border-[#ffffff0a] text-[#ffffff] font-bold py-3.5 rounded-[12px] transition-all flex items-center justify-center gap-2 text-[13px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>

              {/* 4. PASSWORD CHANGE FEATURE */}
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full bg-transparent hover:bg-[#ffffff05] border border-[#ffffff0a] text-[#8b949e] hover:text-[#e6edf3] font-bold py-3.5 rounded-[12px] transition-all flex items-center justify-center gap-2 text-[12px] uppercase tracking-widest"
              >
                <Lock className="w-4 h-4" /> Change Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 1. PERSONAL ACHIEVEMENTS (REMOVE HARDCODE) */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-[#ffffff] text-[20px] font-bold tracking-tight">Personal Achievements</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-[#ffffff0a] to-transparent" />
          </div>
          {achievements.length > 3 && (
            <button 
              onClick={() => setIsAchievementsModalOpen(true)}
              className="ml-4 p-2 text-[#8b949e] hover:text-[#7c79ff] transition-colors flex items-center gap-1 group"
            >
              <span className="text-[11px] font-black uppercase tracking-widest group-hover:block transition-all">See more</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {achievements.length === 0 ? (
            <div className="col-span-3 bg-[#11141d] border border-[#ffffff0a] border-dashed rounded-[24px] p-12 text-center text-[#8b949e]">
              <Trophy className="w-10 h-10 mx-auto mb-4 opacity-20" />
              <p className="text-[13px] uppercase tracking-widest font-black opacity-40">No achievements unlocked yet.</p>
              <p className="text-[11px] mt-2">Maintain consistency to earn collective signals.</p>
            </div>
          ) : (
            achievements.slice(0, 3).map((achievement, i) => {
              const Icon = getIcon(achievement.icon);
              return (
                <div key={i} className="bg-[#11141d] border border-[#ffffff0a] rounded-[24px] p-7 group hover:border-[#ffffff1a] transition-all relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-2.5 rounded-[12px] bg-[#161b22] border border-[#ffffff0a] group-hover:border-white/20 transition-all">
                      <Icon className="w-5 h-5" style={{ color: achievement.color }} />
                    </div>
                    <span className="text-[9px] font-black tracking-[0.2em] text-[#8b949e] bg-[#161b22] px-2.5 py-1 rounded-full border border-[#ffffff0a]">{achievement.type}</span>
                  </div>
                  <h4 className="text-[#ffffff] text-[16px] font-bold mb-2">{achievement.title}</h4>
                  <p className="text-[#8b949e] text-[12px] leading-relaxed font-medium">{achievement.desc}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        <div className="bg-[#11141d]/50 backdrop-blur-sm border border-[#ffffff0a] rounded-[24px] p-10 flex flex-col items-center justify-center text-center group border-l-4 border-l-[#7c79ff]">
           <span className="text-[52px] font-black text-[#ffffff] tracking-tighter leading-none group-hover:scale-110 transition-transform duration-500">{summary?.completion_rate || 0}%</span>
           <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">Efficiency Rate</p>
        </div>
        <div className="bg-[#11141d]/50 backdrop-blur-sm border border-[#ffffff0a] rounded-[24px] p-10 flex flex-col items-center justify-center text-center group border-l-4 border-l-[#39d353]">
           <span className="text-[52px] font-black text-[#ffffff] tracking-tighter leading-none group-hover:scale-110 transition-transform duration-500">{summary?.completed_tasks || 0}</span>
           <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">Completed Nodes</p>
        </div>
        <div className="bg-[#11141d]/50 backdrop-blur-sm border border-[#ffffff0a] rounded-[24px] p-10 flex flex-col items-center justify-center text-center group border-l-4 border-l-[#ff7b72]">
           <span className="text-[52px] font-black text-[#ffffff] tracking-tighter leading-none group-hover:scale-110 transition-transform duration-500">{summary?.completed_tasks && summary.completed_tasks > 0 ? 1 : 0}</span>
           <p className="text-[#8b949e] text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60">Architect Streak</p>
        </div>
      </div>

      {/* MODALS */}
      
      {/* Password Change Modal */}
      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        title="Change Access Protocol"
      >
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.2em]">Current Password</label>
            <input
              type="password"
              required
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              className="w-full bg-[#080b12] border border-[#ffffff0a] rounded-[12px] py-3 px-4 text-white text-[13px] focus:outline-none focus:border-[#7c79ff]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.2em]">New Password</label>
            <input
              type="password"
              required
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              className="w-full bg-[#080b12] border border-[#ffffff0a] rounded-[12px] py-3 px-4 text-white text-[13px] focus:outline-none focus:border-[#7c79ff]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[#8b949e] text-[9px] font-black uppercase tracking-[0.2em]">Confirm New Password</label>
            <input
              type="password"
              required
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="w-full bg-[#080b12] border border-[#ffffff0a] rounded-[12px] py-3 px-4 text-white text-[13px] focus:outline-none focus:border-[#7c79ff]"
            />
          </div>
          {passwordError && <p className="text-[#f85149] text-[11px] font-bold">{passwordError}</p>}
          <button
            type="submit"
            disabled={passwordSaving}
            className="w-full bg-[#7c79ff] hover:bg-[#6d69f0] text-white font-bold py-3.5 rounded-[12px] transition-all flex items-center justify-center gap-2"
          >
            {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </Modal>

      {/* All Achievements Modal */}
      <Modal 
        isOpen={isAchievementsModalOpen} 
        onClose={() => setIsAchievementsModalOpen(false)} 
        title="Collective Signal History"
      >
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {achievements.map((achievement, i) => {
            const Icon = getIcon(achievement.icon);
            return (
              <div key={i} className="flex gap-4 p-4 rounded-[16px] bg-[#161b22] border border-[#ffffff0a]">
                <div className="p-2 h-fit rounded-[10px] bg-[#080b12] border border-[#ffffff0a]">
                  <Icon className="w-4 h-4" style={{ color: achievement.color }} />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-bold text-[14px]">{achievement.title}</h4>
                      <span className="text-[8px] font-black tracking-widest text-[#8b949e] bg-[#080b12] px-1.5 py-0.5 rounded-full border border-[#ffffff0a]">{achievement.type}</span>
                   </div>
                   <p className="text-[#8b949e] text-[11px] leading-relaxed">{achievement.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

    </div>
  );
}
