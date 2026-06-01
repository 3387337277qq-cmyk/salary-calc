import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { BookOpen, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { user, loading, signIn, signUp } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-leaf-50 via-mint-50 to-leaf-100">
        <div className="w-8 h-8 border-3 border-mint-200 border-t-mint-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/records" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setSubmitting(false);

    if (result.error) {
      if (result.error.includes('Invalid login')) {
        setError('邮箱或密码错误');
      } else if (result.error.includes('already registered')) {
        setError('该邮箱已注册，请直接登录');
      } else if (result.error.includes('Email not confirmed')) {
        setError('邮箱未验证，请检查邮箱');
      } else {
        setError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-leaf-50 via-mint-50 to-leaf-100 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-mint-500 text-white shadow-lg shadow-mint-200 mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-mint-800">教师工资计算器</h1>
          <p className="text-sm text-gray-400 mt-1">轻松管理课时与工资</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-mint-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 text-center">
            {isSignUp ? '注册账号' : '登录'}
          </h2>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
              className="w-full px-3 py-2.5 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300 focus:border-transparent bg-mint-50/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
                required
                minLength={6}
                className="w-full px-3 py-2.5 pr-10 border border-mint-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mint-300 focus:border-transparent bg-mint-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-mint-500 text-white rounded-xl text-sm font-semibold hover:bg-mint-600 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
          >
            {submitting ? '请稍候...' : isSignUp ? '注册' : '登录'}
          </button>

          <p className="text-center text-sm text-gray-400">
            {isSignUp ? '已有账号？' : '没有账号？'}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-mint-600 font-medium ml-1 hover:underline"
            >
              {isSignUp ? '去登录' : '去注册'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
