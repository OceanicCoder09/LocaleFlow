import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  AuthResponse,
  CreateKeyRequest,
  CreateProjectRequest,
  ImportSummaryResponse,
  InviteMemberRequest,
  KeyWithTranslations,
  Project,
  TranslationItem,
  AuditLogItem,
  User,
  UpsertTranslationRequest,
} from '../types';
import { INITIAL_MOCK_KEYS, INITIAL_MOCK_PROJECTS, INITIAL_MOCK_AUDIT_LOGS } from './mockData';

// Configurable API URL: default to HTTP 5044 for trouble-free local dev, or HTTPS 7197
const DEFAULT_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5044';

export const getApiBaseUrl = (): string => {
  const saved = localStorage.getItem('localeflow_api_url');
  // If user previously saved https://localhost:7197 which hit self-signed cert issues, migrate default to 5044
  if (!saved || saved === 'https://localhost:7197') {
    return DEFAULT_API_URL;
  }
  return saved;
};

export const setApiBaseUrl = (url: string) => {
  localStorage.setItem('localeflow_api_url', url);
  apiClient.defaults.baseURL = url;
};

// Check if demo/mock mode is active
export const isMockModeActive = (): boolean => {
  return localStorage.getItem('localeflow_mock_mode') === 'true';
};

export const setMockModeActive = (active: boolean) => {
  localStorage.setItem('localeflow_mock_mode', active ? 'true' : 'false');
};

// Centralized Axios Instance
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Authorization Bearer token from localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('localeflow_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle HTTP 401 Unauthorized -> clear token & redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirect loop if 401 happened on login/register attempt
      const url = error.config?.url || '';
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
        localStorage.removeItem('localeflow_token');
        localStorage.removeItem('localeflow_user');
        window.dispatchEvent(new CustomEvent('localeflow_unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// In-Memory state for Mock Mode
let mockProjects: Project[] = [...INITIAL_MOCK_PROJECTS];
let mockKeys: Record<number, KeyWithTranslations[]> = JSON.parse(JSON.stringify(INITIAL_MOCK_KEYS));
let mockAuditLogs: Record<number, AuditLogItem[]> = JSON.parse(JSON.stringify(INITIAL_MOCK_AUDIT_LOGS));

// ==========================================
// 1. AUTH API (`/api/auth`)
// ==========================================
export const authApi = {
  register: async (payload: { email: string; password: string; fullName: string }): Promise<AuthResponse> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 400));
      const mockRes: AuthResponse = {
        userId: Math.floor(Math.random() * 9000) + 100,
        email: payload.email,
        fullName: payload.fullName,
        token: `mock_jwt_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
      return mockRes;
    }
    const { data } = await apiClient.post<AuthResponse>('/api/auth/register', payload);
    return data;
  },

  login: async (payload: { email: string; password: string }): Promise<AuthResponse> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 400));
      const mockRes: AuthResponse = {
        userId: 1,
        email: payload.email,
        fullName: payload.email.split('@')[0].toUpperCase(),
        token: `mock_jwt_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
      return mockRes;
    }
    const { data } = await apiClient.post<AuthResponse>('/api/auth/login', payload);
    return data;
  },

  getMe: async (): Promise<User> => {
    if (isMockModeActive()) {
      const stored = localStorage.getItem('localeflow_user');
      if (stored) return JSON.parse(stored);
      return { userId: 1, email: 'admin@localeflow.dev', fullName: 'Demo Administrator' };
    }
    const { data } = await apiClient.get<User>('/api/auth/me');
    return data;
  },
};

// ==========================================
// 2. WORKSPACES / PROJECTS (`/api/projects`)
// ==========================================
export const projectsApi = {
  list: async (): Promise<Project[]> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 200));
      return [...mockProjects];
    }
    const { data } = await apiClient.get<Project[]>('/api/projects');
    return data;
  },

  create: async (payload: CreateProjectRequest): Promise<Project> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 300));
      const newSlug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 9000);
      const newProject: Project = {
        id: Math.max(...mockProjects.map(p => p.id), 0) + 1,
        name: payload.name,
        slug: newSlug,
        defaultLocale: payload.defaultLocale,
        supportedLocales: Array.from(new Set([payload.defaultLocale, ...payload.supportedLocales])),
        apiKey: `lf_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        yourRole: 'Admin',
      };
      mockProjects = [newProject, ...mockProjects];
      mockKeys[newProject.id] = [];
      return newProject;
    }
    const { data } = await apiClient.post<Project>('/api/projects', payload);
    return data;
  },

  inviteMember: async (projectId: number, payload: InviteMemberRequest): Promise<{ message: string }> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 300));
      return { message: `Member ${payload.email} updated with role ${payload.role}.` };
    }
    const { data } = await apiClient.post<{ message: string }>(`/api/projects/${projectId}/members`, payload);
    return data;
  },
};

// ==========================================
// 3. TRANSLATION KEYS & WORKFLOW
// ==========================================
export const keysApi = {
  getKeys: async (
    projectId: number,
    search?: string,
    missingLocale?: string
  ): Promise<KeyWithTranslations[]> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 250));
      let list = mockKeys[projectId] || [];
      if (search && search.trim()) {
        const q = search.toLowerCase();
        list = list.filter((k) => k.keyName.toLowerCase().includes(q));
      }
      if (missingLocale && missingLocale.trim()) {
        list = list.filter(
          (k) => !k.translations.some((t) => t.locale.toLowerCase() === missingLocale.toLowerCase() && t.status === 'Approved')
        );
      }
      return list;
    }

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (missingLocale) params.append('missingLocale', missingLocale);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data } = await apiClient.get<KeyWithTranslations[]>(`/api/projects/${projectId}/keys${qs}`);
    return data;
  },

  createKey: async (projectId: number, payload: CreateKeyRequest): Promise<KeyWithTranslations> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 300));
      const project = mockProjects.find(p => p.id === projectId);
      const newKeyId = Math.floor(Math.random() * 90000) + 1000;
      const initialTranslations: TranslationItem[] = [];

      if (payload.initialDefaultValue && project) {
        const transId = Math.floor(Math.random() * 90000) + 10000;
        initialTranslations.push({
          id: transId,
          locale: project.defaultLocale,
          value: payload.initialDefaultValue,
          status: 'Approved',
          updatedAt: new Date().toISOString(),
        });
        mockAuditLogs[transId] = [
          {
            id: Math.floor(Math.random() * 90000),
            changedByEmail: 'admin@localeflow.dev',
            oldValue: null,
            newValue: payload.initialDefaultValue,
            changedAt: new Date().toISOString(),
          }
        ];
      }

      const created: KeyWithTranslations = {
        keyId: newKeyId,
        keyName: payload.keyName,
        description: payload.description || null,
        maxLength: payload.maxLength || null,
        translations: initialTranslations,
      };

      if (!mockKeys[projectId]) mockKeys[projectId] = [];
      mockKeys[projectId].unshift(created);
      return created;
    }

    const { data } = await apiClient.post<KeyWithTranslations>(`/api/projects/${projectId}/keys`, payload);
    return data;
  },

  upsertTranslation: async (
    projectId: number,
    keyId: number,
    payload: UpsertTranslationRequest
  ): Promise<TranslationItem> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 200));
      const keys = mockKeys[projectId] || [];
      const key = keys.find(k => k.keyId === keyId);
      if (!key) throw new Error("Key not found");

      let translation = key.translations.find(t => t.locale.toLowerCase() === payload.locale.toLowerCase());
      const now = new Date().toISOString();
      const currentUserEmail = localStorage.getItem('localeflow_user')
        ? JSON.parse(localStorage.getItem('localeflow_user')!).email
        : 'translator@localeflow.dev';

      if (!translation) {
        const newTransId = Math.floor(Math.random() * 90000) + 10000;
        translation = {
          id: newTransId,
          locale: payload.locale,
          value: payload.value,
          status: 'Draft',
          updatedAt: now,
        };
        key.translations.push(translation);
        mockAuditLogs[newTransId] = [
          {
            id: Math.floor(Math.random() * 90000),
            changedByEmail: currentUserEmail,
            oldValue: null,
            newValue: payload.value,
            changedAt: now,
          }
        ];
      } else {
        const oldVal = translation.value;
        translation.value = payload.value;
        translation.status = 'NeedsReview';
        translation.updatedAt = now;

        if (!mockAuditLogs[translation.id]) mockAuditLogs[translation.id] = [];
        mockAuditLogs[translation.id].unshift({
          id: Math.floor(Math.random() * 90000),
          changedByEmail: currentUserEmail,
          oldValue: oldVal,
          newValue: payload.value,
          changedAt: now,
        });
      }

      return { ...translation };
    }

    const { data } = await apiClient.put<TranslationItem>(
      `/api/projects/${projectId}/keys/${keyId}/translations`,
      payload
    );
    return data;
  },

  approveTranslation: async (projectId: number, translationId: number): Promise<{ message: string }> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 200));
      const keys = mockKeys[projectId] || [];
      for (const k of keys) {
        const t = k.translations.find(item => item.id === translationId);
        if (t) {
          t.status = 'Approved';
          t.updatedAt = new Date().toISOString();
          break;
        }
      }
      return { message: "Translation approved and cache invalidated." };
    }

    const { data } = await apiClient.patch<{ message: string }>(
      `/api/projects/${projectId}/translations/${translationId}/approve`
    );
    return data;
  },

  getAuditHistory: async (projectId: number, translationId: number): Promise<AuditLogItem[]> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 200));
      return mockAuditLogs[translationId] || [];
    }

    const { data } = await apiClient.get<AuditLogItem[]>(
      `/api/projects/${projectId}/translations/${translationId}/history`
    );
    return data;
  },
};

// ==========================================
// 4. BULK FILE IMPORT & EXPORT
// ==========================================
export const filesApi = {
  importFile: async (
    projectId: number,
    locale: string,
    file: File
  ): Promise<ImportSummaryResponse> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 600));
      // Read file text to simulate real import
      const text = await file.text();
      let count = 0;
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          count = Object.keys(parsed).length;
        } else {
          count = 12; // mock resx count
        }
      } catch {
        count = 8;
      }

      return {
        locale,
        keysCreated: Math.floor(count / 2),
        translationsUpdated: count,
        totalProcessed: count,
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<ImportSummaryResponse>(
      `/api/projects/${projectId}/import?locale=${encodeURIComponent(locale)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  exportFile: async (
    projectId: number,
    projectSlug: string,
    locale: string,
    format: 'json' | 'resx'
  ): Promise<void> => {
    if (isMockModeActive()) {
      await new Promise((r) => setTimeout(r, 300));
      const keys = mockKeys[projectId] || [];
      const dictionary: Record<string, string> = {};
      keys.forEach((k) => {
        const trans = k.translations.find((t) => t.locale.toLowerCase() === locale.toLowerCase() && t.status === 'Approved');
        if (trans) dictionary[k.keyName] = trans.value;
      });

      let blob: Blob;
      let fileName = `${projectSlug}.${locale}.${format}`;

      if (format === 'json') {
        blob = new Blob([JSON.stringify(dictionary, null, 2)], { type: 'application/json' });
      } else {
        const resx = `<?xml version="1.0" encoding="utf-8"?>\n<root>\n${Object.entries(dictionary)
          .map(([k, v]) => `  <data name="${k}" xml:space="preserve"><value>${v}</value></data>`)
          .join('\n')}\n</root>`;
        blob = new Blob([resx], { type: 'application/xml' });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return;
    }

    const response = await apiClient.get(
      `/api/projects/${projectId}/export?locale=${encodeURIComponent(locale)}&format=${format}`,
      {
        responseType: 'blob',
      }
    );

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${projectSlug}.${locale}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
