import { useEffect, useRef } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { CustomToast } from './ui/CustomToast';
import { useAuth } from '../context/AuthContext';

export const RealTimeNotifications = () => {
  const { isAuthenticated } = useAuth();
  const lastCheckedRef = useRef<number>(Date.now());
  const processedIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const showSystemNotification = (notification: any) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/src/assets/logo.png', // Fallback to logo
            tag: `notification-${notification.id}`,
            silent: false
          });
        } catch (err) {
          console.error('Failed to show system notification:', err);
        }
      }
    };

    const checkNotifications = async () => {
      try {
        const unread = await api.getUnreadNotifications();
        if (unread && Array.isArray(unread)) {
          unread.forEach((notification: any) => {
            if (!processedIds.current.has(notification.id)) {
              // 1. Show the in-app toast
              toast.custom((t) => (
                <CustomToast 
                  title={notification.title} 
                  message={notification.message} 
                  type={notification.type} 
                  onClose={() => toast.dismiss(t)}
                />
              ), { duration: 5000 });

              // 2. Show the system notification (cross-platform)
              showSystemNotification(notification);
              
              // 3. Mark as read immediately to stop polling it
              api.markNotificationAsRead(notification.id);
              processedIds.current.add(notification.id);
            }
          });
        }
      } catch (error: any) {
        if (error.message !== 'Session expired. Please sign in again.') {
          console.error('Notification fetch error:', error);
        }
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return null;
};
