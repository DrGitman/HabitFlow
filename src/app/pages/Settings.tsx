import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Lock, 
  Monitor, 
  Mail, 
  Moon
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="p-10 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-['Inter']">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-4">
        {/* Vertical Settings Navigation */}
        <div className="col-span-1 flex flex-col gap-[8px] items-start self-start w-full">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] transition-all text-[14px] ${
              activeTab === 'general' ? 'bg-[#222a3d] text-[#c2c1ff] font-semibold' : 'text-[#c7c4d7] hover:bg-[#222a3d]/50 font-normal'
            }`}
          >
            <SettingsIcon className="w-[15px] h-[15px]" />
            <span className="leading-[20px]">General</span>
          </button>

          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] transition-all text-[14px] ${
              activeTab === 'notifications' ? 'bg-[#222a3d] text-[#c2c1ff] font-semibold' : 'text-[#c7c4d7] hover:bg-[#222a3d]/50 font-normal'
            }`}
          >
            <Bell className="w-[16px] h-[16px]" />
            <span className="leading-[20px]">Notifications</span>
          </button>

          <button 
            onClick={() => setActiveTab('privacy')}
            className={`w-full flex items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] transition-all text-[14px] ${
              activeTab === 'privacy' ? 'bg-[#222a3d] text-[#c2c1ff] font-semibold' : 'text-[#c7c4d7] hover:bg-[#222a3d]/50 font-normal'
            }`}
          >
            <Lock className="w-[13px] h-[16px]" />
            <span className="leading-[20px]">Privacy</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="col-span-3 w-full">
          {activeTab === 'general' && (
            <div className="flex flex-col gap-[32px] items-start w-full">
              <div className="flex flex-col gap-[4px] items-start w-full">
                <h2 className="text-[#dae2fd] text-[24px] font-semibold tracking-[-0.6px] leading-[32px]">
                  General Preferences
                </h2>
                <p className="text-[#c7c4d7] text-[14px] font-normal leading-[20px]">
                  Configure your core application experience.
                </p>
              </div>

              <div className="flex flex-col gap-[16px] w-full">
                {/* Dark mode */}
                <div className="bg-[#171f33] rounded-[12px] w-full">
                  <div className="flex items-center justify-between p-[24px] w-full">
                    <div className="flex gap-[16px] items-center">
                      <div className="bg-[#222a3d] flex items-center justify-center rounded-[8px] w-[40px] h-[40px] shrink-0">
                        <Moon className="w-[18px] h-[18px] text-[#c2c1ff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#dae2fd] text-[16px] font-medium leading-[24px]">Dark mode</span>
                        <span className="text-[#c7c4d7] text-[12px] font-normal leading-[16px]">Switch between light and dark visual themes</span>
                      </div>
                    </div>
                    {/* Toggle Active */}
                    <div className="relative shrink-0 flex items-center">
                      <div className="bg-[#c2c1ff] h-[24px] rounded-[9999px] w-[44px]" />
                      <div className="absolute bg-white left-[22px] rounded-[9999px] w-[20px] h-[20px] top-[2px] shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Desktop notifications */}
                <div className="bg-[#171f33] rounded-[12px] w-full">
                  <div className="flex items-center justify-between p-[24px] w-full">
                    <div className="flex gap-[16px] items-center">
                      <div className="bg-[#222a3d] flex items-center justify-center rounded-[8px] w-[40px] h-[40px] shrink-0">
                        <Monitor className="w-[20px] h-[18px] text-[#c2c1ff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#dae2fd] text-[16px] font-medium leading-[24px]">Desktop notifications</span>
                        <span className="text-[#c7c4d7] text-[12px] font-normal leading-[16px]">Receive alerts directly on your operating system</span>
                      </div>
                    </div>
                    {/* Toggle Inactive */}
                    <div className="relative shrink-0 flex items-center">
                      <div className="bg-[#2d3449] h-[24px] rounded-[9999px] w-[44px]" />
                      <div className="absolute bg-white left-[2px] rounded-[9999px] w-[20px] h-[20px] top-[2px] border border-[#d1d5db]" />
                    </div>
                  </div>
                </div>

                {/* Weekly summary emails */}
                <div className="bg-[#171f33] rounded-[12px] w-full">
                  <div className="flex items-center justify-between p-[24px] w-full">
                    <div className="flex gap-[16px] items-center">
                      <div className="bg-[#222a3d] flex items-center justify-center rounded-[8px] w-[40px] h-[40px] shrink-0">
                        <Mail className="w-[20px] h-[16px] text-[#c2c1ff]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#dae2fd] text-[16px] font-medium leading-[24px]">Weekly summary emails</span>
                        <span className="text-[#c7c4d7] text-[12px] font-normal leading-[16px]">A comprehensive report of your habit streaks every Monday</span>
                      </div>
                    </div>
                    {/* Toggle Active */}
                    <div className="relative shrink-0 flex items-center">
                      <div className="bg-[#c2c1ff] h-[24px] rounded-[9999px] w-[44px]" />
                      <div className="absolute bg-white left-[22px] rounded-[9999px] w-[20px] h-[20px] top-[2px] shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-[32px] items-start w-full">
               <div className="flex flex-col gap-[4px] items-start w-full">
                <h2 className="text-[#dae2fd] text-[24px] font-semibold tracking-[-0.6px] leading-[32px]">
                  Notifications
                </h2>
                <p className="text-[#c7c4d7] text-[14px] font-normal leading-[20px]">
                  Manage how we contact you.
                </p>
              </div>
              <div className="bg-[#171f33] rounded-[12px] w-full p-[24px]">
                <p className="text-[#c7c4d7] text-[14px]">Notification settings are currently managed globally.</p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="flex flex-col gap-[32px] items-start w-full">
              <div className="flex flex-col gap-[4px] items-start w-full">
                <h2 className="text-[#dae2fd] text-[24px] font-semibold tracking-[-0.6px] leading-[32px]">
                  Privacy
                </h2>
                <p className="text-[#c7c4d7] text-[14px] font-normal leading-[20px]">
                  Manage your data and privacy settings.
                </p>
              </div>
              <div className="bg-[#171f33] rounded-[12px] w-full p-[24px]">
                <p className="text-[#c7c4d7] text-[14px]">Your data is encrypted and secure.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
