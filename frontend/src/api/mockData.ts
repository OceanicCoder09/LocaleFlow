import { KeyWithTranslations, Project, AuditLogItem } from '../types';

export const INITIAL_MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: "LocaleFlow Cloud Dashboard",
    slug: "localeflow-cloud",
    defaultLocale: "en",
    supportedLocales: ["en", "es", "de", "fr", "ja"],
    apiKey: "lf_live_948f2c3b88a104de0f92b1574cd6e721",
    yourRole: "Admin",
  },
  {
    id: 2,
    name: "Mobile Banking App iOS & Android",
    slug: "fintech-mobile",
    defaultLocale: "en",
    supportedLocales: ["en", "es", "pt", "fr"],
    apiKey: "lf_live_55a29f310bc944738dafe0210bc94473",
    yourRole: "Translator",
  },
  {
    id: 3,
    name: "E-Commerce Checkout Portal",
    slug: "shop-checkout",
    defaultLocale: "en",
    supportedLocales: ["en", "de", "ja", "zh"],
    apiKey: "lf_live_7718de50a2e345c2bf90123498abec11",
    yourRole: "Viewer",
  }
];

export const INITIAL_MOCK_KEYS: Record<number, KeyWithTranslations[]> = {
  1: [
    {
      keyId: 101,
      keyName: "auth.login.title",
      description: "Header text on user authentication dialog",
      maxLength: 40,
      translations: [
        { id: 1001, locale: "en", value: "Welcome back to LocaleFlow", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 24).toISOString() },
        { id: 1002, locale: "es", value: "Bienvenido de nuevo a LocaleFlow", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 18).toISOString() },
        { id: 1003, locale: "de", value: "Willkommen zurück bei LocaleFlow", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 8).toISOString() },
        { id: 1004, locale: "fr", value: "Bienvenue sur LocaleFlow", status: "NeedsReview", updatedAt: new Date(Date.now() - 3600000 * 2).toISOString() },
      ]
    },
    {
      keyId: 102,
      keyName: "dashboard.stats.active_projects",
      description: "Label for the total active workspaces metric card",
      maxLength: 30,
      translations: [
        { id: 1005, locale: "en", value: "Active Workspaces", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 48).toISOString() },
        { id: 1006, locale: "es", value: "Espacios de trabajo activos", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 20).toISOString() },
        { id: 1007, locale: "de", value: "Aktive Arbeitsbereiche", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 5).toISOString() },
      ]
    },
    {
      keyId: 103,
      keyName: "cta.export_bundle",
      description: "Button text for compiling and downloading json/resx bundles",
      maxLength: 25,
      translations: [
        { id: 1008, locale: "en", value: "Export Bundle", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 72).toISOString() },
        { id: 1009, locale: "es", value: "Exportar paquete", status: "NeedsReview", updatedAt: new Date(Date.now() - 3600000 * 3).toISOString() },
        { id: 1010, locale: "ja", value: "バンドルを出力", status: "Draft", updatedAt: new Date(Date.now() - 3600000).toISOString() },
      ]
    },
    {
      keyId: 104,
      keyName: "errors.network_timeout",
      description: "User friendly error message shown on API timeout",
      maxLength: 80,
      translations: [
        { id: 1011, locale: "en", value: "Connection timed out. Please check your internet connection.", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 12).toISOString() },
        { id: 1012, locale: "fr", value: "Délai de connexion dépassé. Veuillez réessayer.", status: "Approved", updatedAt: new Date(Date.now() - 3600000 * 10).toISOString() },
      ]
    },
    {
      keyId: 105,
      keyName: "keys.table.status.approved",
      description: "Badge text indicating approved translation string",
      maxLength: 20,
      translations: [
        { id: 1013, locale: "en", value: "Approved", status: "Approved", updatedAt: new Date().toISOString() },
        { id: 1014, locale: "es", value: "Aprobado", status: "Approved", updatedAt: new Date().toISOString() },
        { id: 1015, locale: "de", value: "Genehmigt", status: "Approved", updatedAt: new Date().toISOString() },
        { id: 1016, locale: "fr", value: "Approuvé", status: "Approved", updatedAt: new Date().toISOString() },
        { id: 1017, locale: "ja", value: "承認済み", status: "Approved", updatedAt: new Date().toISOString() },
      ]
    }
  ]
};

export const INITIAL_MOCK_AUDIT_LOGS: Record<number, AuditLogItem[]> = {
  1004: [
    {
      id: 501,
      changedByEmail: "translator@localeflow.dev",
      oldValue: "Rebienvenue sur LocaleFlow",
      newValue: "Bienvenue sur LocaleFlow",
      changedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 502,
      changedByEmail: "admin@localeflow.dev",
      oldValue: null,
      newValue: "Rebienvenue sur LocaleFlow",
      changedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
  ],
  1009: [
    {
      id: 503,
      changedByEmail: "alex@agency.com",
      oldValue: "Descargar",
      newValue: "Exportar paquete",
      changedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    }
  ],
  1010: [
    {
      id: 504,
      changedByEmail: "kenji@tokyo-translators.jp",
      oldValue: null,
      newValue: "バンドルを出力",
      changedAt: new Date(Date.now() - 3600000).toISOString(),
    }
  ]
};
