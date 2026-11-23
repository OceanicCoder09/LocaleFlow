import React, { useState, useEffect } from 'react';
import { Project, CreateProjectRequest } from '../../types';
import { projectsApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { RoleBadge } from '../common/Badge';
import { CardSkeleton } from '../common/Skeleton';
import { Modal } from '../common/Modal';
import { Plus, Copy, Check, Search } from 'lucide-react';

interface WorkspacesOverviewProps {
  onSelectProject: (project: Project) => void;
}

export const WorkspacesOverview: React.FC<WorkspacesOverviewProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Project Form State
  const [name, setName] = useState('');
  const [defaultLocale, setDefaultLocale] = useState('en');
  const [supportedLocalesInput, setSupportedLocalesInput] = useState('es, de, fr, ja');
  const [submitting, setSubmitting] = useState(false);

  const { success, error } = useToast();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error('Failed to load workspaces', errObj?.message || 'Could not reach backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success('Copied', text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const locales = supportedLocalesInput
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter(Boolean);

      const payload: CreateProjectRequest = {
        name: name.trim(),
        defaultLocale: defaultLocale.trim().toLowerCase(),
        supportedLocales: locales,
      };

      const created = await projectsApi.create(payload);
      setProjects((prev) => [created, ...prev]);
      setIsNewModalOpen(false);
      setName('');
      setDefaultLocale('en');
      setSupportedLocalesInput('es, de, fr, ja');
      success('Workspace created', created.name);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Creation failed', errObj?.response?.data?.message || errObj?.message || 'Could not create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage translation projects and team members</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Search */}
      <div className="py-4">
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-700">No projects found</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Create your first workspace to start translating.</p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
          >
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    onClick={() => onSelectProject(project)}
                    className="font-semibold text-sm text-gray-900 hover:text-indigo-600 cursor-pointer truncate"
                  >
                    {project.name}
                  </h3>
                  <RoleBadge role={project.yourRole} />
                </div>

                <div className="text-xs text-gray-500 font-mono mb-3 flex items-center gap-1.5">
                  <span>{project.slug}</span>
                  <button
                    onClick={() => handleCopy(project.slug, `slug-${project.id}`)}
                    className="text-gray-400 hover:text-gray-700"
                    title="Copy slug"
                  >
                    {copiedId === `slug-${project.id}` ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Locales */}
                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500">Locales:</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                      {project.defaultLocale} (default)
                    </span>
                    {project.supportedLocales
                      .filter((l) => l.toLowerCase() !== project.defaultLocale.toLowerCase())
                      .map((loc) => (
                        <span
                          key={loc}
                          className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200 uppercase"
                        >
                          {loc}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  {project.supportedLocales.length} language{project.supportedLocales.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => onSelectProject(project)}
                  className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                >
                  Open &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="New Workspace"
        description="Create a localization project"
      >
        <form onSubmit={handleCreateProject} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Web App"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Default Locale *</label>
              <input
                type="text"
                required
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value)}
                placeholder="en"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Locales</label>
              <input
                type="text"
                value={supportedLocalesInput}
                onChange={(e) => setSupportedLocalesInput(e.target.value)}
                placeholder="es, de, fr"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
