import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-leaf-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-mint-200 border-t-mint-500 rounded-full animate-spin" />
          <p className="text-mint-700 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
