import { NavLink } from 'react-router-dom';
import { BookOpen, BarChart3, Users } from 'lucide-react';

const tabs = [
  { to: '/records', icon: BookOpen, label: '课程记录' },
  { to: '/summary', icon: BarChart3, label: '月度汇总' },
  { to: '/students', icon: Users, label: '学生管理' },
];

export function MobileBottomTabs() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-mint-100 safe-area-bottom z-30 shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-xs font-medium transition-colors min-w-0 ${
                isActive
                  ? 'text-mint-600'
                  : 'text-gray-400 hover:text-gray-500'
              }`
            }
          >
            <Icon className="w-6 h-6" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
