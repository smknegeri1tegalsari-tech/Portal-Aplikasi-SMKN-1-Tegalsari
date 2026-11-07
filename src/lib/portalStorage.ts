import { Application, Category, PortalSettings, AccessLog } from '../types';
import { INITIAL_APPLICATIONS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from './schoolData';

const APPS_STORAGE_KEY = 'portal_smkn1_applications';
const CATS_STORAGE_KEY = 'portal_smkn1_categories';
const SETTINGS_STORAGE_KEY = 'portal_smkn1_settings';
const LOGS_STORAGE_KEY = 'portal_smkn1_logs';

const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('[portalStorage] localStorage get blocked', e);
  }
  return memoryStore[key] || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('[portalStorage] localStorage set blocked', e);
  }
  memoryStore[key] = value;
}

// --- APPLICATIONS ---

export function getLocalApplications(): Application[] {
  const stored = safeGet(APPS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('[portalStorage] Error parsing applications:', e);
    }
  }
  // Initialize with INITIAL_APPLICATIONS
  saveLocalApplications(INITIAL_APPLICATIONS);
  return INITIAL_APPLICATIONS;
}

export function saveLocalApplications(apps: Application[]): void {
  safeSet(APPS_STORAGE_KEY, JSON.stringify(apps));
}

export function addOrUpdateLocalApplication(appData: Partial<Application> & { name: string; targetUrl: string; categoryId: string }): Application {
  const apps = getLocalApplications();
  const existingIdx = appData.id ? apps.findIndex((a) => a.id === appData.id) : -1;

  if (existingIdx >= 0) {
    const updated: Application = {
      ...apps[existingIdx],
      ...appData,
      updatedAt: new Date().toISOString(),
    } as Application;
    apps[existingIdx] = updated;
    saveLocalApplications(apps);
    return updated;
  } else {
    const newApp: Application = {
      id: appData.id || `app-${Date.now()}`,
      name: appData.name,
      description: appData.description || '',
      categoryId: appData.categoryId,
      iconName: appData.iconName || 'Laptop',
      targetUrl: appData.targetUrl,
      allowedRoles: appData.allowedRoles || ['SUPER_ADMIN', 'ADMIN', 'USER'],
      isActive: appData.isActive !== false,
      sortOrder: apps.length + 1,
      openCount: 0,
      badge: appData.badge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    apps.push(newApp);
    saveLocalApplications(apps);
    return newApp;
  }
}

export function deleteLocalApplication(appId: string): boolean {
  const apps = getLocalApplications();
  const filtered = apps.filter((a) => a.id !== appId);
  if (filtered.length !== apps.length) {
    saveLocalApplications(filtered);
    return true;
  }
  return false;
}

export function toggleLocalApplicationStatus(appId: string): Application | null {
  const apps = getLocalApplications();
  const app = apps.find((a) => a.id === appId);
  if (app) {
    app.isActive = !app.isActive;
    app.updatedAt = new Date().toISOString();
    saveLocalApplications(apps);
    return app;
  }
  return null;
}

export function incrementAppOpenCount(appId: string): number {
  const apps = getLocalApplications();
  const app = apps.find((a) => a.id === appId);
  if (app) {
    app.openCount = (app.openCount || 0) + 1;
    saveLocalApplications(apps);
    return app.openCount;
  }
  return 0;
}

// --- CATEGORIES ---

export function getLocalCategories(): Category[] {
  const stored = safeGet(CATS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('[portalStorage] Error parsing categories:', e);
    }
  }
  saveLocalCategories(INITIAL_CATEGORIES);
  return INITIAL_CATEGORIES;
}

export function saveLocalCategories(cats: Category[]): void {
  safeSet(CATS_STORAGE_KEY, JSON.stringify(cats));
}

export function addOrUpdateLocalCategory(catData: Partial<Category> & { name: string }): Category {
  const cats = getLocalCategories();
  const existingIdx = catData.id ? cats.findIndex((c) => c.id === catData.id) : -1;

  if (existingIdx >= 0) {
    const updated: Category = {
      ...cats[existingIdx],
      ...catData,
    };
    cats[existingIdx] = updated;
    saveLocalCategories(cats);
    return updated;
  } else {
    const newCat: Category = {
      id: catData.id || `cat-${Date.now()}`,
      name: catData.name,
      description: catData.description || '',
      sortOrder: cats.length + 1,
      createdAt: new Date().toISOString(),
    };
    cats.push(newCat);
    saveLocalCategories(cats);
    return newCat;
  }
}

export function deleteLocalCategory(catId: string): boolean {
  const cats = getLocalCategories();
  const filtered = cats.filter((c) => c.id !== catId);
  if (filtered.length !== cats.length) {
    saveLocalCategories(filtered);
    return true;
  }
  return false;
}

// --- SETTINGS ---

export function getLocalSettings(): PortalSettings {
  const stored = safeGet(SETTINGS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('[portalStorage] Error parsing settings:', e);
    }
  }
  saveLocalSettings(INITIAL_SETTINGS);
  return INITIAL_SETTINGS;
}

export function saveLocalSettings(settings: PortalSettings): void {
  safeSet(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

// --- LOGS ---

export function getLocalLogs(): AccessLog[] {
  const stored = safeGet(LOGS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('[portalStorage] Error parsing logs:', e);
    }
  }
  return [];
}

export function addLocalLog(log: Omit<AccessLog, 'id' | 'timestamp'>): void {
  const logs = getLocalLogs();
  const newLog: AccessLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  if (logs.length > 500) logs.length = 500;
  safeSet(LOGS_STORAGE_KEY, JSON.stringify(logs));
}
