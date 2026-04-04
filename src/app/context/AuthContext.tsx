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

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            // Temporarily set the token for the API call
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              // Token is valid, restore session
              setToken(storedToken);
              setUser(parsedUser);
            } else {
              // Token invalid or expired, clear it
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          } catch (verifyError) {
            // Network error or verification failed, clear invalid token
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        } catch (e) {
          // Invalid stored data, clear it
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
    // Persist to localStorage
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    const response: any = await api.signup(email, password, fullName);
    setToken(response.token);
    setUser(response.user);
    // Persist to localStorage
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Clear localStorage
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
