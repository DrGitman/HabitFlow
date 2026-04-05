import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface User {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  rank?: string;
}

interface Preferences {
  dark_mode: boolean;
  desktop_notifications: boolean;
  weekly_summary_emails: boolean;
  notification_reminders: boolean;
  notification_achievements: boolean;
  privacy_show_rank: boolean;
  privacy_share_stats: boolean;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  preferences: Preferences | null;
  refreshPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPreferences = async () => {
    try {
      const prefs = await api.getUserPreferences() as Preferences;
      setPreferences(prefs);
      
      // Apply theme
      if (prefs.dark_mode === false) {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    } catch (error) {
      console.error('Failed to refresh preferences:', error);
    }
  };

  useEffect(() => {
    // Silent login - restore session from localStorage and verify with backend
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // Verify token with backend by fetching profile
          try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              setToken(storedToken);
              setUser(parsedUser);
              
              // Load preferences after restoring session
              const prefsResponse = await fetch(`${API_BASE_URL}/api/preferences`, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (prefsResponse.ok) {
                const prefs = await prefsResponse.json();
                setPreferences(prefs);
                if (prefs.dark_mode === false) document.body.classList.add('light-theme');
              }
            } else {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          } catch (verifyError) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        } catch (e) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      setIsLoading(false);
    };
    
    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response: any = await api.login(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    
    // Fetch preferences on login
    await refreshPreferences();
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    const response: any = await api.signup(email, password, fullName);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    
    // Fetch preferences on signup
    await refreshPreferences();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPreferences(null);
    document.body.classList.remove('light-theme');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        login,
        signup,
        logout,
        isAuthenticated: !!token,
        isLoading,
        preferences,
        refreshPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
