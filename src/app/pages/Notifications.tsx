import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Bell, Check, Trash2, Calendar, Award, Target, MessageSquare, Flame } from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: number;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Calendar className="w-5 h-5 text-[#58a6ff]" />;
      case 'achievement': return <Award className="w-5 h-5 text-[#39d353]" />;
      case 'milestone': return <Target className="w-5 h-5 text-[#f85149]" />;
      case 'streak': return <Flame className="w-5 h-5 text-[#ff7b72]" />;
      default: return <MessageSquare className="w-5 h-5 text-[#8b949e]" />;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[32px] font-black text-[#e6edf3] tracking-tight">Notification Center</h2>
          <p className="text-[#8b949e] text-[14px] mt-1 font-medium">System alerts and achievement milestones.</p>
        </div>
        <button
          onClick={() => notifications.forEach(n => !n.is_read && handleMarkRead(n.id))}
          className="text-[12px] font-black text-[#58a6ff] hover:text-[#58a6ff]/80 transition-colors bg-[#58a6ff]/10 px-4 py-2 rounded-full border border-[#58a6ff]/20"
        >
          MARK ALL AS READ
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <Bell className="w-12 h-12 text-[#30363d] animate-bounce" />
          <p className="text-[#8b949e] font-medium">Syncing notifications...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`group flex items-start gap-4 p-5 rounded-[16px] border border-[#30363d] transition-all hover:border-[#444c56] ${
                !notification.is_read ? 'bg-[#161b22] border-l-[#58a6ff] border-l-4' : 'bg-[#0d1117]/50 opacity-80'
              }`}
            >
              <div className={`p-2.5 rounded-[12px] bg-[#21262d] ${!notification.is_read ? 'ring-2 ring-[#58a6ff]/20' : ''}`}>
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-[16px] font-bold ${!notification.is_read ? 'text-[#e6edf3]' : 'text-[#8b949e]'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-[11px] text-[#8b949e] font-medium">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[14px] text-[#8b949e] leading-relaxed">
                  {notification.message}
                </p>
                
                <div className="flex items-center gap-4 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="text-[11px] font-black text-[#39d353] flex items-center gap-1.5 hover:underline"
                    >
                      <Check className="w-3 h-3" />
                      MARK AS READ
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="text-[11px] font-black text-[#f85149] flex items-center gap-1.5 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    DELETE
                  </button>
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-[#161b22]/30 rounded-[24px] border border-dashed border-[#30363d]">
              <div className="w-16 h-16 bg-[#21262d] rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-[#8b949e]" />
              </div>
              <h4 className="text-[18px] font-bold text-[#e6edf3] mb-2">System Status: Clear</h4>
              <p className="text-[#8b949e] max-w-[280px]">You're all caught up. No new notifications in your feed.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
