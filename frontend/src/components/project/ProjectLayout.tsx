import React, { useState } from 'react';
import { Project } from '../../types';
import { RoleBadge } from '../common/Badge';
import { Tab1TranslationMatrix } from './Tab1TranslationMatrix';
import { Tab2ImportExportTeam } from './Tab2ImportExportTeam';
import { ArrowLeft, Table2, FolderArchive } from 'lucide-react';

interface ProjectLayoutProps {
  project: Project;
  onBack: () => void;
}

export type TabType = 'matrix' | 'files';

export const ProjectLayout: React.FC<ProjectLayoutProps> = ({ project, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('matrix');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* Top Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects</span>
              </button>
              <RoleBadge role={project.yourRole} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-xs text-gray-500 font-mono">
              Slug: {project.slug} &bull; Default: {project.defaultLocale}
            </p>
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            {project.supportedLocales.map((loc) => (
              <span
                key={loc}
                className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 uppercase font-mono text-[11px]"
              >
                {loc}
              </span>
            ))}
          </div>
        </div>

        {/* 2 Tabs */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Translations</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Files & Team</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'matrix' && <Tab1TranslationMatrix project={project} />}
        {activeTab === 'files' && <Tab2ImportExportTeam project={project} />}
      </div>
    </div>
  );
};
