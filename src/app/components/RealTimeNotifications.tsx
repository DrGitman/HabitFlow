import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { CustomToast } from './ui/CustomToast';
import { useAuth } from '../context/AuthContext';

export const RealTimeNotifications = () => {
  const { isAuthenticated } = useAuth();
  const processedIds = useRef<Set<number>>(new Set());
  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (isAuthenticated) {
      api.getUserPreferences().then(setPrefs).catch(console.error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !prefs) return;

    const showSystemNotification = (notification: any) => {
      // Respect the global desktop notifications setting
      if (!prefs.desktop_notifications) return;

      // Filter by type if needed
      if (notification.type === 'achievement' && !prefs.notification_achievements) return;
      if (notification.type === 'reminder' && !prefs.notification_reminders) return;

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/src/assets/logo.png',
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
              // 1. Show the in-app toast (always show this as it's part of the app UI)
              toast.custom((t) => (
                <CustomToast 
                  title={notification.title} 
                  message={notification.message} 
                  type={notification.type} 
                  onClose={() => toast.dismiss(t)}
                />
              ), { duration: 5000 });

              // 2. Show the system notification (respecting preferences)
              showSystemNotification(notification);

              // Keep notifications unread until the user views or opens them.
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
  }, [isAuthenticated, prefs]);

  return null;
};
