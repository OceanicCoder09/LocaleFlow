import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Globe2 } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login, register, apiBaseUrl, updateApiBaseUrl, isMockMode, toggleMockMode } = useAuth();
  const { success, error } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await register(fullName.trim(), email.trim(), password);
        success('Account created', 'Welcome to LocaleFlow');
      } else {
        await login(email.trim(), password);
        success('Signed in', `Welcome ${email}`);
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Authentication failed. Please verify credentials or backend connection.';
      error('Auth Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (role: 'Admin' | 'Translator') => {
    if (role === 'Admin') {
      setEmail('admin@localeflow.dev');
      setPassword('AdminPassword123!');
      setFullName('Admin User');
    } else {
      setEmail('translator@localeflow.dev');
      setPassword('TranslatorPass123!');
      setFullName('Translator User');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-9 h-9 rounded bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2">
            <Globe2 className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">LocaleFlow</h1>
          <p className="text-xs text-gray-500 mt-0.5">Localization & Translation Platform</p>
        </div>

        {/* Tab Switch */}
        <div className="flex border-b border-gray-200 mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
              !isRegister
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 pb-2 border-b-2 text-center transition-colors ${
              isRegister
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-500 mb-2 flex items-center justify-between">
            <span>Quick fill credentials:</span>
            <button
              onClick={() => toggleMockMode(!isMockMode)}
              className="text-indigo-600 hover:underline"
            >
              {isMockMode ? 'Live Mode' : 'Demo Mode'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleFillDemo('Admin')}
              className="p-1.5 border border-gray-200 rounded text-left hover:bg-gray-50 text-gray-700"
            >
              <div className="font-medium text-gray-900">Admin</div>
              <div className="text-[10px] text-gray-500 truncate">admin@localeflow.dev</div>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('Translator')}
              className="p-1.5 border border-gray-200 rounded text-left hover:bg-gray-50 text-gray-700"
            >
              <div className="font-medium text-gray-900">Translator</div>
              <div className="text-[10px] text-gray-500 truncate">translator@localeflow.dev</div>
            </button>
          </div>

          {/* Minimal target URL toggle */}
          <div className="mt-3 text-[11px] text-gray-500 text-center">
            Backend:{' '}
            <button
              type="button"
              onClick={() => {
                const next = apiBaseUrl.includes('5044') ? 'https://localhost:7197' : 'http://localhost:5044';
                updateApiBaseUrl(next);
              }}
              className="text-indigo-600 hover:underline font-mono"
            >
              {apiBaseUrl}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
