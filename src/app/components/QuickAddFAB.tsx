import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckSquare, Activity, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function QuickAddFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: <CheckSquare className="w-5 h-5" />, label: 'Add Task',  color: '#58a6ff', path: '/actions?tab=tasks&action=new' },
    { icon: <Activity    className="w-5 h-5" />, label: 'Add Habit', color: '#39d353', path: '/actions?tab=habits&action=new' },
    { icon: <Target      className="w-5 h-5" />, label: 'Add Goal',  color: '#bc8cff', path: '/actions?tab=goals&action=new' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-4 space-y-3 flex flex-col items-end">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  navigate(action.path);
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-[12px] font-black px-3 py-1.5 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.label.toUpperCase()}
                </span>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border border-[#ffffff10] transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: action.color }}
                >
                  {action.icon}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${
          isOpen ? 'bg-[#30363d] rotate-90' : 'bg-[#7d79ff] hover:bg-[#7d79ff]/90'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-6 h-6 text-[#e6edf3]" /> : <Plus className="w-8 h-8 text-[#0d1117]" />}
      </motion.button>
      
      {/* Background Overlay when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-[#0d1117]/60 backdrop-blur-sm z-[-1]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
