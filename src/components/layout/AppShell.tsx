import { Routes, Route, Navigate } from 'react-router-dom';
import { MobileBottomTabs } from './MobileBottomTabs';
import { DesktopSidebar } from './DesktopSidebar';
import { RecordListPage } from '../../pages/RecordListPage';
import { RecordFormPage } from '../../pages/RecordFormPage';
import { StudentManagementPage } from '../../pages/StudentManagementPage';
import { SummaryPage } from '../../pages/SummaryPage';
import { PricingPage } from '../../pages/PricingPage';
import { useAuthStore } from '../../stores/authStore';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppShell() {
  const { user, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-leaf-50 flex">
      <DesktopSidebar userEmail={user?.email ?? ''} onSignOut={signOut} />

      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {/* 手机端顶部栏 */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-mint-100">
          <Link to="/pricing" className="text-xs text-gray-400 hover:text-mint-600">定价设置</Link>
          <button onClick={signOut} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
            <LogOut className="w-3.5 h-3.5" />退出
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-4 lg:py-6">
          <Routes>
            <Route path="/records" element={<RecordListPage />} />
            <Route path="/records/new" element={<RecordFormPage />} />
            <Route path="/records/:id/edit" element={<RecordFormPage />} />
            <Route path="/students" element={<StudentManagementPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/" element={<Navigate to="/records" replace />} />
          </Routes>
        </div>
      </main>

      {/* 移动端底部导航 */}
      <MobileBottomTabs />
    </div>
  );
}
