import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Camera,
  BarChart3,
  Users,
  DollarSign,
  LogOut,
} from 'lucide-react';

interface Props {
  userEmail: string;
  onSignOut: () => void;
}

export function DesktopSidebar({ userEmail, onSignOut }: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-mint-100 fixed top-0 left-0 h-full shadow-sm z-30">
      {/* Logo */}
      <div className="p-5 border-b border-mint-100">
        <h1 className="text-lg font-bold text-mint-700 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          教师工资计算器
        </h1>
        <p className="text-xs text-gray-400 mt-1 truncate">{userEmail}</p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItem to="/records" icon={BookOpen} label="课程记录" />
        <NavItem to="/ocr" icon={Camera} label="拍照识别" />
        <NavItem to="/summary" icon={BarChart3} label="月度汇总" />
        <NavItem to="/students" icon={Users} label="学生管理" />
        <NavItem to="/pricing" icon={DollarSign} label="定价设置" />
      </nav>

      {/* 退出按钮 */}
      <div className="p-3 border-t border-mint-100">
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </button>
      </div>
    </aside>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-mint-100 text-mint-700'
            : 'text-gray-600 hover:bg-mint-50 hover:text-mint-600'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      {label}
    </NavLink>
  );
}
