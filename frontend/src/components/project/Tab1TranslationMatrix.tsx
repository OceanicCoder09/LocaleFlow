import React, { useState, useEffect, useCallback } from 'react';
import { Project, KeyWithTranslations, CreateKeyRequest, AuditLogItem } from '../../types';
import { keysApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../common/Badge';
import { TableSkeleton } from '../common/Skeleton';
import { Modal } from '../common/Modal';
import {
  Search,
  Plus,
  Save,
  Clock,
  X,
  Check,
} from 'lucide-react';

interface Tab1TranslationMatrixProps {
  project: Project;
}

export const Tab1TranslationMatrix: React.FC<Tab1TranslationMatrixProps> = ({ project }) => {
  const [keys, setKeys] = useState<KeyWithTranslations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [missingLocale, setMissingLocale] = useState('');

  // Editing state
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [approvingIds, setApprovingIds] = useState<Record<number, boolean>>({});

  // Add Key Modal State
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyMaxLength, setNewKeyMaxLength] = useState<number | ''>('');
  const [newKeyInitialValue, setNewKeyInitialValue] = useState('');
  const [submittingKey, setSubmittingKey] = useState(false);

  // History Slide-over Drawer State
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<AuditLogItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeHistoryKeyName, setActiveHistoryKeyName] = useState('');
  const [activeHistoryLocale, setActiveHistoryLocale] = useState('');

  const { success, error, warning } = useToast();

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const data = await keysApi.getKeys(
        project.id,
        search || undefined,
        missingLocale || undefined
      );
      setKeys(data);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error('Failed to load keys', errObj?.message || 'Error fetching keys from API');
    } finally {
      setLoading(false);
    }
  }, [project.id, search, missingLocale, error]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCellChange = (keyId: number, locale: string, value: string) => {
    const key = `${keyId}_${locale}`;
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveTranslation = async (keyId: number, locale: string) => {
    const editKey = `${keyId}_${locale}`;
    const value = editedValues[editKey];
    if (value === undefined) return;

    const keyItem = keys.find((k) => k.keyId === keyId);
    if (keyItem?.maxLength && value.length > keyItem.maxLength) {
      warning('Max Length Exceeded', `Length: ${value.length}. Max: ${keyItem.maxLength}.`);
      return;
    }

    try {
      setSavingKeys((prev) => ({ ...prev, [editKey]: true }));
      const updated = await keysApi.upsertTranslation(project.id, keyId, {
        locale,
        value,
      });

      setKeys((prev) =>
        prev.map((k) => {
          if (k.keyId !== keyId) return k;
          const existingIdx = k.translations.findIndex(
            (t) => t.locale.toLowerCase() === locale.toLowerCase()
          );
          let newTrans = [...k.translations];
          if (existingIdx >= 0) {
            newTrans[existingIdx] = updated;
          } else {
            newTrans.push(updated);
          }
          return { ...k, translations: newTrans };
        })
      );

      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[editKey];
        return next;
      });

      success('Saved', `Updated ${locale}`);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Save failed', errObj?.response?.data?.message || errObj?.message || 'Failed to update');
    } finally {
      setSavingKeys((prev) => ({ ...prev, [editKey]: false }));
    }
  };

  const handleApproveTranslation = async (translationId: number, locale: string) => {
    try {
      setApprovingIds((prev) => ({ ...prev, [translationId]: true }));
      await keysApi.approveTranslation(project.id, translationId);

      setKeys((prev) =>
        prev.map((k) => ({
          ...k,
          translations: k.translations.map((t) =>
            t.id === translationId ? { ...t, status: 'Approved', updatedAt: new Date().toISOString() } : t
          ),
        }))
      );

      success('Approved', `Approved ${locale}`);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Approval failed', errObj?.response?.data?.message || errObj?.message || 'Failed to approve');
    } finally {
      setApprovingIds((prev) => ({ ...prev, [translationId]: false }));
    }
  };

  const handleOpenHistory = async (translationId: number, keyName: string, locale: string) => {
    setActiveHistoryKeyName(keyName);
    setActiveHistoryLocale(locale);
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);

    try {
      const logs = await keysApi.getAuditHistory(project.id, translationId);
      setHistoryLogs(logs);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      error('Failed to load history', errObj?.message || 'Could not fetch history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      setSubmittingKey(true);
      const payload: CreateKeyRequest = {
        keyName: newKeyName.trim(),
        description: newKeyDescription.trim() || undefined,
        maxLength: newKeyMaxLength ? Number(newKeyMaxLength) : undefined,
        initialDefaultValue: newKeyInitialValue.trim() || undefined,
      };

      const created = await keysApi.createKey(project.id, payload);
      setKeys((prev) => [created, ...prev]);
      setIsAddKeyModalOpen(false);
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyMaxLength('');
      setNewKeyInitialValue('');
      success('Key Created', created.keyName);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      error('Failed to create key', errObj?.response?.data?.message || errObj?.message || 'Could not create key');
    } finally {
      setSubmittingKey(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keys..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>

          <select
            value={missingLocale}
            onChange={(e) => setMissingLocale(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white text-gray-700"
          >
            <option value="">All Locales</option>
            {project.supportedLocales.map((loc) => (
              <option key={loc} value={loc}>
                Missing {loc.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {project.yourRole === 'Admin' && (
          <button
            onClick={() => setIsAddKeyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Key</span>
          </button>
        )}
      </div>

      {/* Matrix Table */}
      {loading ? (
        <TableSkeleton rows={5} columns={project.supportedLocales.length + 1} />
      ) : keys.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-700">No translation keys found</p>
          <p className="text-xs text-gray-500 mt-1">
            {search || missingLocale ? 'Clear your filters to view all keys.' : 'Add your first key to start.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="p-3 min-w-[200px] max-w-[240px]">Key</th>
                {project.supportedLocales.map((loc) => (
                  <th key={loc} className="p-3 min-w-[260px]">
                    <span className="font-mono">{loc.toUpperCase()}</span>
                    {loc.toLowerCase() === project.defaultLocale.toLowerCase() && (
                      <span className="ml-1 text-[10px] text-gray-500 font-sans font-normal">(source)</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((k) => (
                <tr key={k.keyId} className="hover:bg-gray-50/50">
                  {/* Left Column: Key identifier & metadata */}
                  <td className="p-3 align-top font-mono text-gray-900">
                    <div className="font-semibold text-xs break-all">{k.keyName}</div>
                    {k.description && (
                      <div className="text-[11px] text-gray-500 mt-0.5 font-sans">{k.description}</div>
                    )}
                    {k.maxLength && (
                      <div className="text-[10px] text-gray-400 mt-1 font-sans">Max: {k.maxLength} chars</div>
                    )}
                  </td>

                  {/* Locale Columns */}
                  {project.supportedLocales.map((locale) => {
                    const translation = k.translations.find(
                      (t) => t.locale.toLowerCase() === locale.toLowerCase()
                    );
                    const cellKey = `${k.keyId}_${locale}`;
                    const currentValue =
                      editedValues[cellKey] !== undefined
                        ? editedValues[cellKey]
                        : translation?.value || '';
                    const isDirty =
                      editedValues[cellKey] !== undefined &&
                      editedValues[cellKey] !== (translation?.value || '');
                    const isSaving = savingKeys[cellKey];
                    const isApproving = translation ? approvingIds[translation.id] : false;

                    const canApprove =
                      project.yourRole === 'Admin' &&
                      translation &&
                      translation.status !== 'Approved';

                    return (
                      <td key={locale} className="p-3 align-top">
                        <div className="space-y-1.5">
                          <textarea
                            rows={2}
                            value={currentValue}
                            onChange={(e) => handleCellChange(k.keyId, locale, e.target.value)}
                            placeholder={`Enter ${locale.toUpperCase()}...`}
                            className={`w-full px-2.5 py-1.5 border rounded text-xs text-gray-900 bg-white focus:outline-none transition-colors ${
                              isDirty ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 focus:border-gray-400'
                            }`}
                          />

                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <div>
                              {translation ? (
                                <StatusBadge status={translation.status} />
                              ) : (
                                <span className="text-[11px] text-gray-400">Not translated</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Save button */}
                              {isDirty && (
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSaveTranslation(k.keyId, locale)}
                                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              )}

                              {/* Admin Approve Checkmark */}
                              {canApprove && (
                                <button
                                  type="button"
                                  disabled={isApproving}
                                  onClick={() => handleApproveTranslation(translation.id, locale)}
                                  className="p-1 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded"
                                  title="Approve Translation"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* History Clock */}
                              {translation && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenHistory(translation.id, k.keyName, locale)}
                                  className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                                  title="History"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Key Modal */}
      <Modal
        isOpen={isAddKeyModalOpen}
        onClose={() => setIsAddKeyModalOpen(false)}
        title="Add Translation Key"
        description="Register a new key identifier"
      >
        <form onSubmit={handleCreateKey} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Key Name *</label>
            <input
              type="text"
              required
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. auth.login.button"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={newKeyDescription}
              onChange={(e) => setNewKeyDescription(e.target.value)}
              placeholder="Where this string is used..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Length</label>
            <input
              type="number"
              min={1}
              value={newKeyMaxLength}
              onChange={(e) => setNewKeyMaxLength(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="e.g. 30"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Initial Value ({project.defaultLocale})
            </label>
            <textarea
              rows={2}
              value={newKeyInitialValue}
              onChange={(e) => setNewKeyInitialValue(e.target.value)}
              placeholder="Initial source text..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddKeyModalOpen(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingKey}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {submittingKey ? 'Adding...' : 'Add Key'}
            </button>
          </div>
        </form>
      </Modal>

      {/* History Slide-over Drawer */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            onClick={() => setHistoryDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-gray-200 shadow-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-900">Translation History</h3>
                  <button
                    onClick={() => setHistoryDrawerOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-2 text-xs text-gray-600 border-b border-gray-100 font-mono">
                  <div>{activeHistoryKeyName} ({activeHistoryLocale})</div>
                </div>

                {/* History list */}
                <div className="mt-3 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
                  {historyLoading ? (
                    <div className="text-center py-8 text-xs text-gray-500">Loading history...</div>
                  ) : historyLogs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400">No revisions found.</div>
                  ) : (
                    historyLogs.map((log) => (
                      <div key={log.id} className="p-3 border border-gray-200 rounded text-xs space-y-1">
                        <div className="flex items-center justify-between text-gray-500 text-[11px]">
                          <span className="font-medium text-gray-700">{log.changedByEmail}</span>
                          <span>{new Date(log.changedAt).toLocaleString()}</span>
                        </div>
                        {log.oldValue !== null && (
                          <div className="text-red-600 line-through font-mono text-[11px]">
                            - {log.oldValue}
                          </div>
                        )}
                        <div className="text-green-700 font-mono text-[11px]">
                          + {log.newValue}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setHistoryDrawerOpen(false)}
                  className="w-full py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
