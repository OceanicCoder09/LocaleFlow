import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Project } from '../../types';
import { Modal } from './Modal';
import { Globe2, LogOut, ChevronRight, Settings } from 'lucide-react';

interface NavbarProps {
  currentProject: Project | null;
  onNavigateProjects: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentProject, onNavigateProjects }) => {
  const { user, logout, apiBaseUrl, updateApiBaseUrl, isMockMode, toggleMockMode } = useAuth();
  const { success } = useToast();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(apiBaseUrl);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateApiBaseUrl(tempUrl);
    setIsConfigOpen(false);
    success('Backend URL Updated', tempUrl);
  };

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Left: Branding & Breadcrumb */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateProjects}
              className="flex items-center gap-2 text-left font-bold text-gray-900 text-sm hover:text-indigo-600 transition-colors"
            >
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center">
                <Globe2 className="w-4 h-4" />
              </div>
              <span>LocaleFlow</span>
            </button>

            {currentProject && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 pl-2 border-l border-gray-200">
                <button
                  onClick={onNavigateProjects}
                  className="hover:text-gray-900 transition-colors"
                >
                  Workspaces
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-900">{currentProject.name}</span>
              </div>
            )}
          </div>

          {/* Right: Mode & User Menu */}
          <div className="flex items-center gap-3">
            {/* Live / Demo Mode toggle */}
            <button
              onClick={() => toggleMockMode(!isMockMode)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                isMockMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              }`}
              title="Toggle Live Backend vs Offline Demo Mode"
            >
              {isMockMode ? 'Demo Mode' : 'Live Backend'}
            </button>

            {/* API URL settings trigger */}
            <button
              onClick={() => {
                setTempUrl(apiBaseUrl);
                setIsConfigOpen(true);
              }}
              className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
              title="API Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <span className="text-xs text-gray-600 hidden sm:inline">{user.email}</span>
                <button
                  onClick={() => {
                    onNavigateProjects();
                    logout();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* API Config Modal */}
      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Backend API URL"
        description="Configure the ASP.NET Core API base URL"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Base URL
            </label>
            <input
              type="text"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="http://localhost:5044"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Defaults: <code className="text-indigo-600">http://localhost:5044</code> or <code className="text-indigo-600">https://localhost:7197</code>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsConfigOpen(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
            >
              Save URL
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
