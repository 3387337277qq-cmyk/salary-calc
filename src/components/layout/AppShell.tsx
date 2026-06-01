import { Routes, Route, Navigate } from 'react-router-dom';
import { MobileBottomTabs } from './MobileBottomTabs';
import { DesktopSidebar } from './DesktopSidebar';
import { RecordListPage } from '../../pages/RecordListPage';
import { RecordFormPage } from '../../pages/RecordFormPage';
import { OcrPage } from '../../pages/OcrPage';
import { StudentManagementPage } from '../../pages/StudentManagementPage';
import { SummaryPage } from '../../pages/SummaryPage';
import { PricingPage } from '../../pages/PricingPage';
import { useAuthStore } from '../../stores/authStore';

export function AppShell() {
  const { user, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-leaf-50 flex">
      {/* 桌面端侧边栏 */}
      <DesktopSidebar userEmail={user?.email ?? ''} onSignOut={signOut} />

      {/* 主内容区 */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-4 lg:py-6">
          <Routes>
            <Route path="/records" element={<RecordListPage />} />
            <Route path="/records/new" element={<RecordFormPage />} />
            <Route path="/records/:id/edit" element={<RecordFormPage />} />
            <Route path="/ocr" element={<OcrPage />} />
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
