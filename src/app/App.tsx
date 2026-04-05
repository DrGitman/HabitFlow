import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Actions from './pages/Actions';
import Analytics from './pages/Analytics';
import Calendar from './pages/Calendar';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { Toaster } from './components/ui/sonner';
import { RealTimeNotifications } from './components/RealTimeNotifications';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080b12]">
      <Navigation />
      <div className="ml-64 flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#080b12]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#7c79ff]/20 border-t-[#7c79ff] rounded-full animate-spin" />
          <p className="text-[#8b949e] font-bold uppercase tracking-[0.2em] text-[11px] animate-pulse">Syncing Matrix...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/actions"
        element={
          <ProtectedRoute>
            <Actions />
          </ProtectedRoute>
        }
      />
      {/* Legacy redirects */}
      <Route path="/tasks"  element={<Navigate to="/actions" replace />} />
      <Route path="/habits" element={<Navigate to="/actions" replace />} />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <RealTimeNotifications />
        <Toaster position="top-right" expand={false} richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}