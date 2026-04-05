import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router';
import { CheckSquare, Trophy, RefreshCw } from 'lucide-react';
import Tasks from './Tasks';
import Goals from './Goals';
import Habits from './Habits';

type Tab = 'tasks' | 'goals' | 'habits';

const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'tasks',  label: 'Tasks',  Icon: CheckSquare },
  { id: 'goals',  label: 'Goals',  Icon: Trophy      },
  { id: 'habits', label: 'Habits', Icon: RefreshCw   },
];

export default function Actions() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [forceNew, setForceNew] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const newType = searchParams.get('new');
    const state = location.state as { highlightId?: number; type?: string } | null;
    
    // Handle specific item highlighting from search
    if (state?.highlightId && state?.type) {
      setHighlightId(state.highlightId);
      if (state.type === 'task') setActiveTab('tasks');
      if (state.type === 'habit') setActiveTab('habits');
      if (state.type === 'goal') setActiveTab('goals');
      // Clear state after reading to prevent re-highlighting on tab switch
      window.history.replaceState(null, '');
      return; // Exit early as state takes precedence
    }

    if (tabFromUrl === 'tasks' || tabFromUrl === 'goals' || tabFromUrl === 'habits') {
      setActiveTab(tabFromUrl);
    }
    
    // Handle quick add from navigation
    if (newType === 'task') {
      setActiveTab('tasks');
      setForceNew(true);
      window.history.replaceState(null, '');
    } else if (newType === 'goal') {
      setActiveTab('goals');
      setForceNew(true);
      window.history.replaceState(null, '');
    } else if (newType === 'habit') {
      setActiveTab('habits');
      setForceNew(true);
      window.history.replaceState(null, '');
    }
  }, [searchParams, location.state]);

  // Callback to reset forceNew after child component uses it
  const handleFormOpened = () => {
    setForceNew(false);
  };

  const handleHighlightReset = () => {
    setHighlightId(null);
  };

  return (
    <div className="p-10 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Inter']">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-4">

        {/* ── Left: vertical tab nav (mirrors Settings sidebar) ── */}
        <div className="col-span-1 flex flex-col gap-[8px] items-start self-start w-full">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] transition-all text-[14px] ${
                activeTab === id
                  ? 'bg-[#222a3d] text-[#c2c1ff] font-semibold'
                  : 'text-[#c7c4d7] hover:bg-[#222a3d]/50 font-normal'
              }`}
            >
              <Icon className="w-[15px] h-[15px]" />
              <span className="leading-[20px]">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Right: content area ──
            Each sub-page (Tasks / Goals / Habits) adds its own top-level p-8.
            We use a negative margin wrapper to cancel that padding so content
            aligns flush inside the grid column, identical to how Settings works. */}
        <div className="col-span-3 w-full overflow-hidden">
          <div className="-mx-8 -mt-8">
            {activeTab === 'tasks'  && <Tasks highlightId={highlightId} onHighlightReset={handleHighlightReset} forceNew={forceNew} onFormOpened={handleFormOpened} />}
            {activeTab === 'goals'  && <Goals highlightId={highlightId} onHighlightReset={handleHighlightReset} forceNew={forceNew} onFormOpened={handleFormOpened} />}
            {activeTab === 'habits' && <Habits highlightId={highlightId} onHighlightReset={handleHighlightReset} forceNew={forceNew} onFormOpened={handleFormOpened} />}
          </div>
        </div>

      </div>
    </div>
  );
}
