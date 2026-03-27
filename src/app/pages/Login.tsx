import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import logo from '../../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] flex flex-col items-center justify-center p-4 font-['Inter'] relative overflow-hidden">
      <div className="relative z-10 w-full max-w-[440px]">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HabitFlow" className="h-10 w-auto brightness-200" />
          </div>
          <h1 className="text-[#ffffff] text-[22px] font-black tracking-[0.2em] leading-none uppercase mb-2">HABITFLOW</h1>
          <p className="text-[#8b949e] text-[11px] font-medium tracking-[0.1em] uppercase opacity-60">Habit Architect</p>
        </div>

        {/* Card */}
        <div className="bg-[#11141d] border border-[#ffffff0a] rounded-[24px] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-[#ffffff] text-[20px] font-bold tracking-tight">Welcome Back</h2>
            <p className="text-[#8b949e] text-[12px] mt-1 font-medium">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[#ffffff] text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-70">Email Address</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ffffff05] flex items-center justify-center border border-[#ffffff0a]">
                  <Mail className="w-[14px] h-[14px] text-[#8b949e]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="milla.j@example.com"
                  className="w-full bg-[#0a0c12] text-[#e6edf3] pl-14 pr-4 py-3.5 rounded-[12px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 focus:outline-none transition-all placeholder:text-[#30363d] text-[14px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="block text-[#ffffff] text-[10px] font-black uppercase tracking-[0.15em] opacity-70">Password</label>
                <button type="button" className="text-[#7c79ff] text-[10px] font-bold uppercase tracking-widest hover:underline">Forgot?</button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ffffff05] flex items-center justify-center border border-[#ffffff0a]">
                  <Lock className="w-[14px] h-[14px] text-[#8b949e]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a0c12] text-[#e6edf3] pl-14 pr-12 py-3.5 rounded-[12px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 focus:outline-none transition-all placeholder:text-[#30363d] text-[14px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#7c79ff] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-[16px] h-[16px]" />
                  ) : (
                    <Eye className="w-[16px] h-[16px]" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[#f85149]/10 border border-[#f851491a] text-[#f85149] px-4 py-3 rounded-[12px] text-[12px] font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#8e8cf7] to-[#6d69f0] hover:from-[#7c79ff] hover:to-[#524eff] text-white font-bold py-3.5 rounded-[12px] shadow-[0_12px_24px_rgba(124,121,255,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[14px] tracking-tight mt-1 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#8b949e] text-[13px] font-medium">
              New to HabitFlow? <Link to="/signup" className="text-[#ffffff] font-bold hover:text-[#7c79ff] transition-colors ml-1">Create Account</Link>
            </p>
          </div>
        </div>

        {/* Legal Links Footer */}
        <div className="mt-6 flex items-center justify-center gap-6">
            <button className="text-[#8b949e] text-[10px] font-bold uppercase tracking-widest hover:text-[#7c79ff] transition-colors">Terms of Service</button>
            <div className="w-1 h-1 rounded-full bg-[#ffffff0a]" />
            <button className="text-[#8b949e] text-[10px] font-bold uppercase tracking-widest hover:text-[#7c79ff] transition-colors">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}
