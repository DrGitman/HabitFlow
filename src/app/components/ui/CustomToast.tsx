import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, X, Target, Zap } from 'lucide-react';

interface CustomToastProps {
  title: string;
  message: string;
  type: string;
  onClose?: () => void;
}

export const CustomToast = ({ title, message, type, onClose }: CustomToastProps) => {
  // Map types to premium dark styles
  const config = {
    success: {
      header: 'SUCCESS',
      color: 'text-[#39d353]',
      iconClass: 'bg-[#39d353] text-[#0d1117]',
      Icon: CheckCircle2
    },
    habit_completed: {
      header: 'HABIT COMPLETE',
      color: 'text-[#39d353]',
      iconClass: 'bg-[#39d353] text-[#0d1117]',
      Icon: CheckCircle2
    },
    warning: {
      header: 'WARNING',
      color: 'text-[#f0883e]',
      iconClass: 'bg-[#f0883e] text-[#0d1117]',
      Icon: AlertCircle
    },
    error: {
      header: 'ERROR',
      color: 'text-[#f85149]',
      iconClass: 'bg-[#f85149] text-[#0d1117]',
      Icon: XCircle
    },
    task_completed: {
      header: 'TASK COMPLETE',
      color: 'text-[#58a6ff]',
      iconClass: 'bg-[#58a6ff] text-[#0d1117]',
      Icon: Target
    },
    achievement_unlocked: {
      header: 'ACHIEVEMENT',
      color: 'text-[#d2a8ff]',
      iconClass: 'bg-[#d2a8ff] text-[#0d1117]',
      Icon: Zap
    },
    default: {
      header: 'NOTIFICATION',
      color: 'text-[#8b949e]',
      iconClass: 'bg-[#8b949e] text-[#0d1117]',
      Icon: AlertCircle
    }
  };

  const current = config[type as keyof typeof config] || config.default;
  const Icon = current.Icon;

  return (
    <div className="flex items-center gap-4 p-4 pl-5 rounded-[20px] bg-[#161b22] border border-[#ffffff0a] shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[340px] max-w-[420px] backdrop-blur-md relative group">
      {/* Glow Effect */}
      <div className={`absolute -inset-1 rounded-[22px] blur-xl opacity-10 transition-opacity group-hover:opacity-20 ${current.color.replace('text-', 'bg-')}`} />
      
      {/* Icon Section */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${current.iconClass}`}>
        <Icon className="w-6 h-6 stroke-[2.5px]" />
      </div>

      {/* Text Section */}
      <div className="flex-1 min-w-0 pr-6">
        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-0.5 ${current.color}`}>
          {current.header}
        </h4>
        <h5 className="text-[15px] font-bold text-[#f0f6fc] leading-tight truncate">
          {title}
        </h5>
        <p className="text-[13px] text-[#8b949e] leading-snug mt-1 line-clamp-2">
          {message}
        </p>
      </div>

      {/* Close Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#ffffff0a] p-1.5 rounded-full transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
