import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, Check, Shield, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import logo from '../../assets/logo.png';

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the terms');
      return;
    }

    setLoading(true);

    try {
      await signup(formData.email, formData.password, formData.fullName);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
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
            <h2 className="text-[#ffffff] text-[20px] font-bold tracking-tight">Create Account</h2>
            <p className="text-[#8b949e] text-[12px] mt-1 font-medium">Join HabitFlow to start tracking your success.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[#ffffff] text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-70">Full Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ffffff05] flex items-center justify-center border border-[#ffffff0a]">
                  <UserIcon className="w-[14px] h-[14px] text-[#8b949e]" />
                </div>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full bg-[#0a0c12] text-[#e6edf3] pl-14 pr-4 py-3 rounded-[12px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 focus:outline-none transition-all placeholder:text-[#30363d] text-[14px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[#ffffff] text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-70">Email Address</label>
              <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ffffff05] flex items-center justify-center border border-[#ffffff0a]">
                  <Mail className="w-[14px] h-[14px] text-[#8b949e]" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="milla.j@example.com"
                  className="w-full bg-[#0a0c12] text-[#e6edf3] pl-14 pr-4 py-3 rounded-[12px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 focus:outline-none transition-all placeholder:text-[#30363d] text-[14px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[#ffffff] text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-70">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ffffff05] flex items-center justify-center border border-[#ffffff0a]">
                    <Lock className="w-[14px] h-[14px] text-[#8b949e]" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#0a0c12] text-[#e6edf3] pl-14 pr-10 py-3 rounded-[12px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 focus:outline-none transition-all placeholder:text-[#30363d] text-[13px]"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#7c79ff] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[14px] h-[14px]" />
                    ) : (
                      <Eye className="w-[14px] h-[14px]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[#ffffff] text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-70">Confirm</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ffffff05] flex items-center justify-center border border-[#ffffff0a]">
                    <Shield className="w-[14px] h-[14px] text-[#8b949e]" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#0a0c12] text-[#e6edf3] pl-14 pr-10 py-3 rounded-[12px] border border-[#ffffff0a] focus:border-[#7c79ff] focus:ring-1 focus:ring-[#7c79ff]/20 focus:outline-none transition-all placeholder:text-[#30363d] text-[13px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#7c79ff] transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-[14px] h-[14px]" />
                    ) : (
                      <Eye className="w-[14px] h-[14px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 px-1 pt-1">
              <button
                type="button"
                onClick={() => setAgreeTerms(!agreeTerms)}
                className={`mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                  agreeTerms 
                    ? 'bg-[#7c79ff] border-[#7c79ff]' 
                    : 'bg-[#0a0c12] border-[#ffffff1a] hover:border-[#ffffff33]'
                }`}
              >
                {agreeTerms && <Check className="w-3 h-3 text-white stroke-[3px]" />}
              </button>
              <label className="text-[#8b949e] text-[10px] leading-relaxed cursor-pointer select-none" onClick={() => setAgreeTerms(!agreeTerms)}>
                I agree to the <span className="text-[#7c79ff] font-semibold hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[#7c79ff] font-semibold hover:underline cursor-pointer">Privacy Policy</span>.
              </label>
            </div>

            {error && (
              <div className="bg-[#f85149]/10 border border-[#f851491a] text-[#f85149] px-4 py-3 rounded-[12px] text-[12px] font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#8e8cf7] to-[#6d69f0] hover:from-[#7c79ff] hover:to-[#524eff] text-white font-bold py-3.5 rounded-[12px] shadow-[0_12px_24px_rgba(124,121,255,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[14px] tracking-tight mt-1"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#8b949e] text-[13px] font-medium">
              Already have an account? <Link to="/login" className="text-[#ffffff] font-bold hover:text-[#7c79ff] transition-colors ml-1">Log In</Link>
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
