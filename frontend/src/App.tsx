import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { AuthView } from './components/auth/AuthView';
import { WorkspacesOverview } from './components/workspaces/WorkspacesOverview';
import { ProjectLayout } from './components/project/ProjectLayout';
import { Project } from './types';

const MainContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Whenever user logs out, logs in, or switches accounts, always reset to the dashboard (workspaces overview)
  useEffect(() => {
    setSelectedProject(null);
  }, [user?.userId, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Navbar
        currentProject={selectedProject}
        onNavigateProjects={() => setSelectedProject(null)}
      />

      <main className="flex-1">
        {selectedProject ? (
          <ProjectLayout
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <WorkspacesOverview onSelectProject={(p) => setSelectedProject(p)} />
        )}
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        LocaleFlow &bull; Multi-Tenant Localization Platform
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
