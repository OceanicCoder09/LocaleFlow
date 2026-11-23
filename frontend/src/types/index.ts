export type ProjectRole = 'Admin' | 'Translator' | 'Viewer';

export type TranslationStatus = 'Draft' | 'NeedsReview' | 'Approved';

export interface User {
  userId: number | string;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  userId: number;
  email: string;
  fullName: string;
  token: string;
  expiresAt: string;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  defaultLocale: string;
  supportedLocales: string[];
  apiKey: string;
  yourRole: ProjectRole;
}

export interface CreateProjectRequest {
  name: string;
  defaultLocale: string;
  supportedLocales: string[];
}

export interface InviteMemberRequest {
  email: string;
  role: number; // 0 = Viewer, 1 = Translator, 2 = Admin
}

export interface TranslationItem {
  id: number;
  locale: string;
  value: string;
  status: TranslationStatus;
  updatedAt: string;
}

export interface KeyWithTranslations {
  keyId: number;
  keyName: string;
  description: string | null;
  maxLength: number | null;
  translations: TranslationItem[];
}

export interface CreateKeyRequest {
  keyName: string;
  description?: string;
  maxLength?: number;
  initialDefaultValue?: string;
}

export interface UpsertTranslationRequest {
  locale: string;
  value: string;
}

export interface AuditLogItem {
  id: number;
  changedByEmail: string;
  oldValue: string | null;
  newValue: string;
  changedAt: string;
}

export interface ImportSummaryResponse {
  locale: string;
  keysCreated: number;
  translationsUpdated: number;
  totalProcessed: number;
}
