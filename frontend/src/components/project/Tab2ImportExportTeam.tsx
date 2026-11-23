import React, { useState } from 'react';
import { Project, ImportSummaryResponse, InviteMemberRequest } from '../../types';
import { filesApi, projectsApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { UploadCloud, Download, UserPlus } from 'lucide-react';

interface Tab2ImportExportTeamProps {
  project: Project;
}

export const Tab2ImportExportTeam: React.FC<Tab2ImportExportTeamProps> = ({ project }) => {
  const { success, error } = useToast();

  // Import State
  const [importLocale, setImportLocale] = useState(project.defaultLocale);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummaryResponse | null>(null);

  // Export State
  const [exportLocale, setExportLocale] = useState(project.defaultLocale);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Invite Team State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<number>(1);
  const [isInviting, setIsInviting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.json') && !file.name.endsWith('.resx')) {
        error('Invalid File', 'Only .json and .resx files are supported.');
        return;
      }
      setSelectedFile(file);
      setImportSummary(null);
    }
  };

  const handleUploadImport = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const summary = await filesApi.importFile(project.id, importLocale, selectedFile);
      setImportSummary(summary);
      success('Imported', `Processed ${summary.totalProcessed} keys for ${summary.locale}`);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Import failed', errObj?.response?.data?.message || errObj?.message || 'Could not import file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async (format: 'json' | 'resx') => {
    try {
      setIsExporting(format);
      await filesApi.exportFile(project.id, project.slug, exportLocale, format);
      success('Exported', `${project.slug}.${exportLocale}.${format}`);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Export failed', errObj?.response?.data?.message || errObj?.message || 'Failed to export');
    } finally {
      setIsExporting(null);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      const payload: InviteMemberRequest = {
        email: inviteEmail.trim().toLowerCase(),
        role: Number(inviteRole),
      };

      const res = await projectsApi.inviteMember(project.id, payload);
      success('Member Updated', res.message || `Assigned role to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole(1);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Invite failed', errObj?.response?.data?.message || errObj?.message || 'Could not update member');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 2-Column: Import & Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bulk Import */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm text-gray-900">Bulk File Import</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Upload .json or .resx translation files</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Locale</label>
              <select
                value={importLocale}
                onChange={(e) => setImportLocale(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-800 uppercase"
              >
                {project.supportedLocales.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select File (.json or .resx)</label>
              <input
                type="file"
                accept=".json,.resx"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>

            {importSummary && (
              <div className="p-2.5 rounded bg-green-50 border border-green-200 text-xs text-green-800">
                Created: {importSummary.keysCreated} &bull; Updated: {importSummary.translationsUpdated} &bull; Total: {importSummary.totalProcessed}
              </div>
            )}

            <button
              onClick={handleUploadImport}
              disabled={!selectedFile || isUploading || project.yourRole !== 'Admin'}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Import File'}
            </button>
          </div>
        </div>

        {/* Bulk Export */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm text-gray-900">Export Bundles</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Download approved translation files</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Locale</label>
              <select
                value={exportLocale}
                onChange={(e) => setExportLocale(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-800 uppercase"
              >
                {project.supportedLocales.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting !== null}
                className="py-2 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded transition-colors"
              >
                {isExporting === 'json' ? 'Downloading...' : 'Export .JSON'}
              </button>
              <button
                onClick={() => handleExport('resx')}
                disabled={isExporting !== null}
                className="py-2 px-3 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded transition-colors"
              >
                {isExporting === 'resx' ? 'Downloading...' : 'Export .RESX'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-sm text-gray-900">Team & Roles</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Assign member permissions for this project</p>

        <form onSubmit={handleInviteMember} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-gray-700 mb-1">User Email</label>
            <input
              type="email"
              required
              disabled={project.yourRole !== 'Admin'}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@company.com"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              disabled={project.yourRole !== 'Admin'}
              value={inviteRole}
              onChange={(e) => setInviteRole(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-800 disabled:opacity-50"
            >
              <option value={1}>Translator</option>
              <option value={0}>Viewer</option>
              <option value={2}>Admin</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isInviting || project.yourRole !== 'Admin'}
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded transition-colors disabled:opacity-50"
            >
              {isInviting ? 'Updating...' : 'Assign Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
