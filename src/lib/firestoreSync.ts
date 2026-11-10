import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Application, Category, PortalSettings, User, AccessLog } from '../types';
import {
  saveLocalApplications,
  saveLocalCategories,
  saveLocalSettings,
  getLocalApplications,
  getLocalCategories,
  getLocalSettings,
} from './portalStorage';

// --- APPLICATIONS ---

export async function fetchCloudApplications(): Promise<Application[]> {
  try {
    const snap = await getDocs(collection(db, 'applications'));
    const apps: Application[] = [];
    snap.forEach((d) => {
      apps.push({ id: d.id, ...(d.data() as any) });
    });
    apps.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    saveLocalApplications(apps);
    return apps;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch applications from cloud:', err);
  }
  return getLocalApplications();
}

// Clean helper: Firestore rejects any object containing `undefined` values
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export async function syncCloudApplication(app: Application): Promise<void> {
  const path = `applications/${app.id}`;
  try {
    const cleaned = cleanFirestoreData(app);
    await setDoc(doc(db, 'applications', app.id), cleaned, { merge: true });
    console.log(`[Firestore] Successfully saved application ${app.name} (${app.id}) to Cloud Firestore`);
  } catch (err) {
    console.error('[Firestore] Failed to sync application to cloud:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // suppress so UI is not blocked
    }
  }
}

export async function deleteCloudApplication(appId: string): Promise<void> {
  const path = `applications/${appId}`;
  try {
    await deleteDoc(doc(db, 'applications', appId));
    console.log(`[Firestore] Successfully deleted application ${appId} from Cloud Firestore`);
  } catch (err) {
    console.error('[Firestore] Failed to delete application in cloud:', err);
  }
}

export function subscribeCloudApplications(
  onUpdate: (apps: Application[]) => void
): () => void {
  try {
    const q = collection(db, 'applications');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps: Application[] = [];
        snapshot.forEach((d) => {
          apps.push({ id: d.id, ...(d.data() as any) });
        });
        apps.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        saveLocalApplications(apps);
        onUpdate(apps);
      },
      (error) => {
        console.warn('[Firestore] Realtime applications listener error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] Failed to setup applications subscription:', err);
    return () => {};
  }
}

// --- CATEGORIES ---

export async function fetchCloudCategories(): Promise<Category[]> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    const cats: Category[] = [];
    snap.forEach((d) => {
      cats.push({ id: d.id, ...(d.data() as any) });
    });
    cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    saveLocalCategories(cats);
    return cats;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch categories from cloud:', err);
  }
  return getLocalCategories();
}

export async function syncCloudCategory(cat: Category): Promise<void> {
  try {
    const cleaned = cleanFirestoreData(cat);
    await setDoc(doc(db, 'categories', cat.id), cleaned, { merge: true });
    console.log(`[Firestore] Successfully saved category ${cat.name} to Cloud Firestore`);
  } catch (err) {
    console.error('[Firestore] Failed to sync category to cloud:', err);
  }
}

export async function deleteCloudCategory(catId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', catId));
    console.log(`[Firestore] Successfully deleted category ${catId} from Cloud Firestore`);
  } catch (err) {
    console.error('[Firestore] Failed to delete category in cloud:', err);
  }
}

export function subscribeCloudCategories(
  onUpdate: (cats: Category[]) => void
): () => void {
  try {
    const q = collection(db, 'categories');
    return onSnapshot(
      q,
      (snapshot) => {
        const cats: Category[] = [];
        snapshot.forEach((d) => {
          cats.push({ id: d.id, ...(d.data() as any) });
        });
        cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        saveLocalCategories(cats);
        onUpdate(cats);
      },
      (error) => {
        console.warn('[Firestore] Realtime categories listener error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Failed to setup categories subscription:', err);
    return () => {};
  }
}

// --- SETTINGS ---

export async function fetchCloudSettings(): Promise<PortalSettings> {
  try {
    let snap = await getDoc(doc(db, 'settings', 'global_settings'));
    if (!snap.exists()) {
      snap = await getDoc(doc(db, 'settings', 'global-settings'));
    }
    if (snap.exists()) {
      const data = snap.data() as PortalSettings;
      saveLocalSettings(data);
      return data;
    }
  } catch (err) {
    console.warn('[Firestore] Failed to fetch settings from cloud:', err);
  }
  return getLocalSettings();
}

export async function syncCloudSettings(settings: PortalSettings): Promise<void> {
  try {
    const cleaned = cleanFirestoreData(settings);
    await setDoc(doc(db, 'settings', 'global_settings'), cleaned, { merge: true });
    await setDoc(doc(db, 'settings', 'global-settings'), cleaned, { merge: true });
  } catch (err) {
    console.error('[Firestore] Failed to sync settings to cloud:', err);
  }
}

// --- USERS ---

export async function fetchCloudUsers(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      const users: User[] = [];
      snap.forEach((d) => {
        const u = d.data();
        users.push({
          id: d.id,
          username: u.username,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          department: u.department,
          allowedAppIds: u.allowedAppIds,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        });
      });
      return users;
    }
  } catch (err) {
    console.warn('[Firestore] Failed to fetch users from cloud:', err);
  }
  return [];
}

export async function syncCloudUser(user: User): Promise<void> {
  try {
    const cleaned = cleanFirestoreData(user);
    await setDoc(doc(db, 'users', user.id), cleaned, { merge: true });
  } catch (err) {
    console.error('[Firestore] Failed to sync user to cloud:', err);
  }
}

export async function deleteCloudUser(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('[Firestore] Failed to delete user in cloud:', err);
  }
}

// --- ACCESS LOGS ---

export async function recordCloudAccessLog(log: Omit<AccessLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullLog: AccessLog = {
      ...log,
      id: logId,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'access_logs', logId), fullLog);
  } catch (err) {
    console.warn('[Firestore] Failed to record cloud log:', err);
  }
}
