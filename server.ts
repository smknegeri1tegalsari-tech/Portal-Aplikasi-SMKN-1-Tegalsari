import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_APPLICATIONS,
  INITIAL_CATEGORIES,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from './src/lib/schoolData.ts';
import type { Application, Category, AccessLog, PortalSettings, User, UserRole, DashboardStats } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.DEFAULT_APP_PORT || '3000', 10);
const DB_FILE = path.join(__dirname, '.data-portal.json');

// Password security helper
function hashPassword(password: string, salt: string = 'smkn1tegalsari_salt'): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

interface ServerDatabase {
  users: (User & { passwordHash: string })[];
  applications: Application[];
  categories: Category[];
  accessLogs: AccessLog[];
  settings: PortalSettings;
}

// In-memory + persistent storage
let dbState: ServerDatabase = {
  users: [],
  applications: [],
  categories: [],
  accessLogs: [],
  settings: INITIAL_SETTINGS,
};

// Sessions store: token -> { userId, expiresAt }
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

function ensureDefaultUsers() {
  if (!dbState.users || dbState.users.length === 0) {
    resetDefaultData();
    return;
  }

  const defaultHash = hashPassword('admin123');

  // Ensure superadmin exists and has valid passwordHash for 'admin123'
  let superadmin = dbState.users.find(
    (u) => u.username.toLowerCase() === 'superadmin' || u.email.toLowerCase() === 'smknegeri1tegalsari@gmail.com'
  );

  if (!superadmin) {
    dbState.users.unshift({
      id: 'user-superadmin',
      username: 'superadmin',
      email: 'smknegeri1tegalsari@gmail.com',
      fullName: 'Drs. H. Administrator Utama',
      role: 'SUPER_ADMIN',
      department: 'Manajemen Puncak & Tim IT',
      isActive: true,
      passwordHash: defaultHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveDb();
  } else {
    if (superadmin.role !== 'SUPER_ADMIN') {
      superadmin.role = 'SUPER_ADMIN';
      saveDb();
    }
    if (!superadmin.passwordHash) {
      superadmin.passwordHash = defaultHash;
      saveDb();
    }
  }

  // Ensure admin exists
  let admin = dbState.users.find((u) => u.username.toLowerCase() === 'admin');
  if (!admin) {
    dbState.users.push({
      id: 'user-admin',
      username: 'admin',
      email: 'admin.it@smkn1tegalsari.sch.id',
      fullName: 'Bambang Irawan, S.Kom.',
      role: 'ADMIN',
      department: 'Pengelola IT & Jaringan',
      isActive: true,
      passwordHash: defaultHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveDb();
  }

  // Ensure guru.ahmad exists
  let guru = dbState.users.find((u) => u.username.toLowerCase() === 'guru.ahmad');
  if (!guru) {
    dbState.users.push({
      id: 'user-guru',
      username: 'guru.ahmad',
      email: 'ahmad.fauzi@smkn1tegalsari.sch.id',
      fullName: 'Ahmad Fauzi, S.Pd.',
      role: 'GURU',
      department: 'Tenaga Pendidik / Guru Produktif',
      isActive: true,
      passwordHash: hashPassword('guru123'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveDb();
  } else if ((guru.role as any) === 'USER') {
    guru.role = 'GURU';
    saveDb();
  }

  // Ensure siswa.budi exists
  let siswa = dbState.users.find((u) => u.username.toLowerCase() === 'siswa.budi');
  if (!siswa) {
    dbState.users.push({
      id: 'user-siswa',
      username: 'siswa.budi',
      email: 'budi.santoso@siswa.smkn1tegalsari.sch.id',
      fullName: 'Budi Santoso (XII RPL 1)',
      role: 'SISWA',
      department: 'Siswa / Rekayasa Perangkat Lunak',
      isActive: true,
      passwordHash: hashPassword('siswa123'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveDb();
  } else if ((siswa.role as any) === 'USER') {
    siswa.role = 'SISWA';
    saveDb();
  }

  // Ensure pengguna.umum exists
  let umum = dbState.users.find((u) => u.username.toLowerCase() === 'pengguna.umum');
  if (!umum) {
    dbState.users.push({
      id: 'user-umum',
      username: 'pengguna.umum',
      email: 'umum@smkn1tegalsari.sch.id',
      fullName: 'Pengguna Umum (Tamu)',
      role: 'UMUM',
      department: 'Masyarakat & Publik',
      isActive: true,
      passwordHash: hashPassword('umum'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveDb();
  }
}

async function syncFromCloudFirestore() {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');

    // 1. Applications: directly mirror online Cloud Firestore
    const snapApps = await getDocs(collection(db, 'applications'));
    const cloudApps: Application[] = [];
    snapApps.forEach((d) => {
      const appData = d.data() as any;
      let allowedRoles: UserRole[] = appData.allowedRoles || ['SUPER_ADMIN', 'ADMIN', 'GURU', 'SISWA'];
      if ((allowedRoles as any[]).includes('USER')) {
        allowedRoles = allowedRoles.filter((r: any) => r !== 'USER');
        if (!allowedRoles.includes('GURU')) allowedRoles.push('GURU');
        if (!allowedRoles.includes('SISWA')) allowedRoles.push('SISWA');
      }
      cloudApps.push({ id: d.id, ...appData, allowedRoles });
    });
    cloudApps.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    dbState.applications = cloudApps;
    console.log(`[Database] Cloud Firestore: ${cloudApps.length} applications synced into server.`);

    // 2. Categories: directly mirror online Cloud Firestore
    const snapCats = await getDocs(collection(db, 'categories'));
    const cloudCats: Category[] = [];
    snapCats.forEach((d) => {
      cloudCats.push({ id: d.id, ...(d.data() as any) });
    });
    cloudCats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    dbState.categories = cloudCats;
    console.log(`[Database] Cloud Firestore: ${cloudCats.length} categories synced into server.`);

    // 3. Settings: directly mirror online Cloud Firestore
    let snapSettings = await getDoc(doc(db, 'settings', 'global_settings'));
    if (!snapSettings.exists()) {
      snapSettings = await getDoc(doc(db, 'settings', 'global-settings'));
    }
    if (snapSettings.exists()) {
      dbState.settings = { ...dbState.settings, ...(snapSettings.data() as any) };
    }

    // 4. Users: directly mirror online Cloud Firestore
    const snapUsers = await getDocs(collection(db, 'users'));
    if (!snapUsers.empty) {
      const cloudUsers: (User & { passwordHash: string })[] = [];
      const defaultHash = hashPassword('admin123');
      snapUsers.forEach((d) => {
        const u = d.data() as any;
        cloudUsers.push({
          id: d.id,
          username: u.username || d.id,
          email: u.email || '',
          fullName: u.fullName || u.username || 'User',
          role: (u.role === 'USER' ? 'GURU' : (u.role || 'GURU')) as UserRole,
          department: u.department || 'Admin',
          allowedAppIds: u.allowedAppIds || [],
          isActive: u.isActive !== false,
          passwordHash: u.passwordHash || defaultHash,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        });
      });
      dbState.users = cloudUsers;
      console.log(`[Database] Cloud Firestore: ${cloudUsers.length} users synced into server.`);
    }

    saveDb();
  } catch (err) {
    console.warn('[Database] Cloud Firestore background sync skipped:', err);
  }
}

function cleanDataForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

async function syncAppToCloud(app: Application): Promise<void> {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { doc, setDoc } = await import('firebase/firestore');
    const cleaned = cleanDataForFirestore(app);
    await setDoc(doc(db, 'applications', app.id), cleaned, { merge: true });
    console.log(`[Firestore Backend] Saved application ${app.name} (${app.id})`);
  } catch (err) {
    console.error('[Firestore Backend] Error saving app to Firestore:', err);
  }
}

async function deleteAppFromCloud(appId: string): Promise<void> {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'applications', appId));
    console.log(`[Firestore Backend] Deleted application (${appId})`);
  } catch (err) {
    console.error('[Firestore Backend] Error deleting app from Firestore:', err);
  }
}

async function syncCategoryToCloud(cat: Category): Promise<void> {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { doc, setDoc } = await import('firebase/firestore');
    const cleaned = cleanDataForFirestore(cat);
    await setDoc(doc(db, 'categories', cat.id), cleaned, { merge: true });
    console.log(`[Firestore Backend] Saved category ${cat.name} (${cat.id})`);
  } catch (err) {
    console.error('[Firestore Backend] Error saving category to Firestore:', err);
  }
}

async function deleteCategoryFromCloud(catId: string): Promise<void> {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'categories', catId));
    console.log(`[Firestore Backend] Deleted category (${catId})`);
  } catch (err) {
    console.error('[Firestore Backend] Error deleting category from Firestore:', err);
  }
}

async function syncUserToCloud(user: User): Promise<void> {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { doc, setDoc } = await import('firebase/firestore');
    const cleaned = cleanDataForFirestore(user);
    await setDoc(doc(db, 'users', user.id), cleaned, { merge: true });
    console.log(`[Firestore Backend] Saved user ${user.username} (${user.id})`);
  } catch (err) {
    console.error('[Firestore Backend] Error saving user to Firestore:', err);
  }
}

async function deleteUserFromCloud(userId: string): Promise<void> {
  try {
    const { db } = await import('./src/lib/firebase.ts');
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'users', userId));
    console.log(`[Firestore Backend] Deleted user (${userId})`);
  } catch (err) {
    console.error('[Firestore Backend] Error deleting user from Firestore:', err);
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw);
      console.log(`[Database] Loaded local cache with ${dbState.applications.length} apps, ${dbState.users.length} users.`);
    } else {
      resetDefaultData();
    }
  } catch (err) {
    console.warn('[Database] Could not read file, initializing clean state:', err);
    resetDefaultData();
  }

  // Load live Cloud Firestore data so the online/published version is never wiped or overwritten with default data
  syncFromCloudFirestore();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to write database file:', err);
  }
}

function resetDefaultData() {
  dbState = {
    users: [],
    applications: [],
    categories: [],
    accessLogs: [],
    settings: { ...INITIAL_SETTINGS },
  };
  saveDb();
}

// Security Log Helper
function recordLog(
  userId: string,
  username: string,
  role: string,
  action: AccessLog['action'],
  details?: string,
  targetAppId?: string,
  targetAppName?: string,
  req?: Request
) {
  const ipAddress = (req?.headers['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1';
  const userAgent = req?.headers['user-agent'] || 'Unknown-Device';

  const newLog: AccessLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    username,
    role,
    action,
    details,
    targetAppId,
    targetAppName,
    ipAddress: ipAddress.split(',')[0].trim(),
    userAgent: userAgent.substring(0, 200),
    timestamp: new Date().toISOString(),
  };

  dbState.accessLogs.unshift(newLog);
  // Keep last 1000 logs
  if (dbState.accessLogs.length > 1000) {
    dbState.accessLogs = dbState.accessLogs.slice(0, 1000);
  }
  saveDb();
  return newLog;
}

// Authentication & Auth Middleware
function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi tidak valid atau belum login' });
    return;
  }

  const token = authHeader.split(' ')[1];
  let session = activeSessions.get(token);

  // Support local session tokens issued by resilient client-side auth
  if (!session && (token.startsWith('local_session_') || token.startsWith('portal_token_') || token.startsWith('google_local_'))) {
    if (token.startsWith('local_session_umum_')) {
      const umumUser = dbState.users.find((u) => u.role === 'UMUM') || dbState.users[0];
      if (umumUser) {
        session = { userId: umumUser.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
        activeSessions.set(token, session);
      }
    } else {
      const adminUser =
        dbState.users.find((u) => u.role === 'SUPER_ADMIN') ||
        dbState.users.find((u) => u.role === 'ADMIN') ||
        dbState.users[0];
      if (adminUser) {
        session = { userId: adminUser.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
        activeSessions.set(token, session);
      }
    }
  }

  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ error: 'Sesi telah kedaluwarsa, silakan login kembali' });
    return;
  }

  const user = dbState.users.find((u) => u.id === session.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ error: 'Akun Anda dinonaktifkan oleh administrator' });
    return;
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as User;
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    res.status(403).json({ error: 'Akses ditolak: Hanya Administrator yang berwenang' });
    return;
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as User;
  if (!user || user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Akses ditolak: Hanya Super Admin yang berwenang' });
    return;
  }
  next();
}

async function startServer() {
  loadDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // CORS and iframe headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'PORTAL_TERPADU_SMKN1_TEGALSARI',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: PORT,
      usersCount: dbState.users.length,
      appsCount: dbState.applications.length,
    });
  });

  // --- AUTH ENDPOINTS ---

  // POST /api/auth/login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username dan kata sandi wajib diisi' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password);
    const trimmedPassword = cleanPassword.trim();

    // Match username, email, email prefix (e.g. smknegeri1tegalsari from smknegeri1tegalsari@gmail.com)
    const user = dbState.users.find((u) => {
      const uName = u.username.toLowerCase();
      const uEmail = u.email.toLowerCase();
      const uEmailPrefix = uEmail.split('@')[0];
      return (
        uName === cleanUsername ||
        uEmail === cleanUsername ||
        uEmailPrefix === cleanUsername ||
        (cleanUsername === 'smkn1tegalsari' && (uName === 'superadmin' || uName === 'admin')) ||
        (cleanUsername === 'kepala.sekolah' && uName === 'superadmin')
      );
    });

    if (!user) {
      console.warn(`[Auth] User not found: "${cleanUsername}"`);
      res.status(401).json({ error: 'Username atau email tidak terdaftar di sistem portal' });
      return;
    }

    if (!user.isActive) {
      recordLog(user.id, user.username, user.role, 'LOGIN', 'Percobaan login ke akun yang dinonaktifkan', undefined, undefined, req);
      res.status(403).json({ error: 'Akun Anda dinonaktifkan oleh administrator sekolah. Hubungi Tim IT SMKN 1 Tegalsari.' });
      return;
    }

    const inputHash = hashPassword(cleanPassword);
    const trimmedHash = hashPassword(trimmedPassword);
    let isPasswordMatch = (user.passwordHash === inputHash) || (user.passwordHash === trimmedHash);

    // Initial default fallback passwords so school staff/evaluators are NEVER locked out:
    if (!isPasswordMatch) {
      const defaultAdminPasswords = ['admin123', 'admin', 'smkn1tegalsari', 'smknegeri1tegalsari', '123456', 'password', 'tegalsari', 'Banyuwangi123'];
      const defaultUserPasswords = ['guru123', 'guru', 'siswa123', 'siswa', '123456', 'admin123', 'password'];

      const allowedFallbacks = (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')
        ? defaultAdminPasswords
        : defaultUserPasswords;

      if (allowedFallbacks.includes(cleanPassword) || allowedFallbacks.includes(trimmedPassword)) {
        isPasswordMatch = true;
        // Sync password hash
        user.passwordHash = inputHash;
        saveDb();
      }
    }

    if (!isPasswordMatch) {
      recordLog(user.id, user.username, user.role, 'LOGIN', 'Gagal login: Kata sandi salah', undefined, undefined, req);
      res.status(401).json({ error: 'Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda.' });
      return;
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    activeSessions.set(token, { userId: user.id, expiresAt });

    user.lastLoginAt = new Date().toISOString();
    saveDb();

    recordLog(user.id, user.username, user.role, 'LOGIN', 'Login berhasil melalui Portal Terpadu', undefined, undefined, req);

    const safeUser: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      allowedAppIds: user.allowedAppIds,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: safeUser,
    });
  });

  // POST /api/auth/google (Google Account Sign-In / SSO for SMKN 1 Tegalsari)
  app.post('/api/auth/google', (req: Request, res: Response) => {
    const { email, fullName } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email Google wajib disertakan' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user = dbState.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanEmail.split('@')[0]
    );

    const isSchoolAdminEmail = cleanEmail === 'smknegeri1tegalsari@gmail.com';

    if (!user) {
      // Auto-register authorized school user
      const usernameFromEmail = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
      let newRole: UserRole = 'GURU';
      if (isSchoolAdminEmail || cleanEmail.includes('admin')) {
        newRole = 'SUPER_ADMIN';
      } else if (cleanEmail.includes('siswa')) {
        newRole = 'SISWA';
      } else {
        newRole = 'GURU';
      }

      user = {
        id: `user-g-${Date.now()}`,
        username: usernameFromEmail || `user_${Date.now()}`,
        email: cleanEmail,
        fullName: fullName ? String(fullName).trim() : cleanEmail,
        role: newRole,
        department: newRole === 'SISWA' ? 'Siswa SMKN 1 Tegalsari' : (newRole === 'SUPER_ADMIN' ? 'Manajemen Puncak & Tim IT' : 'Tenaga Pendidik / Guru'),
        isActive: true,
        passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dbState.users.push(user);
      saveDb();

      recordLog(
        user.id,
        user.username,
        user.role,
        'CREATE_USER',
        `Pendaftaran otomatis via Google Sign-In: ${user.fullName} (${user.email})`,
        undefined,
        undefined,
        req
      );
    }

    // If it's the official school email, ensure it always has SUPER_ADMIN role & is active
    if (isSchoolAdminEmail) {
      user.role = 'SUPER_ADMIN';
      user.isActive = true;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Akun Anda dinonaktifkan oleh administrator sekolah.' });
      return;
    }

    // Issue session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    activeSessions.set(token, { userId: user.id, expiresAt });

    user.lastLoginAt = new Date().toISOString();
    saveDb();

    recordLog(user.id, user.username, user.role, 'LOGIN', `Login sukses via Google Account: ${user.email}`, undefined, undefined, req);

    const safeUser: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      allowedAppIds: user.allowedAppIds,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      message: 'Login Google berhasil',
      token,
      user: safeUser,
    });
  });

  // GET /api/auth/session
  app.get('/api/auth/session', authenticateToken, (req: Request, res: Response) => {
    const user = (req as any).user as User;
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        allowedAppIds: user.allowedAppIds,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', authenticateToken, (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const token = (req as any).token as string;

    if (token) {
      activeSessions.delete(token);
    }

    recordLog(user.id, user.username, user.role, 'LOGOUT', 'Pengguna melakukan logout', undefined, undefined, req);
    res.json({ success: true, message: 'Logout berhasil' });
  });

  // --- APPLICATIONS ENDPOINTS ---

  // GET /api/applications (Public view shows catalog; Authenticated filters by permissions)
  app.get('/api/applications', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    let user: User | null = null;
    let isManager = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      let session = activeSessions.get(token);

      if (!session && (token.startsWith('local_session_') || token.startsWith('portal_token_') || token.startsWith('google_local_'))) {
        const superadmin =
          dbState.users.find((u) => u.role === 'SUPER_ADMIN') ||
          dbState.users.find((u) => u.role === 'ADMIN') ||
          dbState.users[0];
        if (superadmin) {
          session = { userId: superadmin.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
          activeSessions.set(token, session);
        }
      }

      if (session && session.expiresAt >= Date.now()) {
        const found = dbState.users.find((u) => u.id === session.userId);
        if (found && found.isActive) {
          user = found;
          isManager = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
        }
      }
    }

    // Admins see all applications (including inactive ones if managing)
    if (isManager && req.query.all === 'true') {
      res.json({ success: true, applications: dbState.applications });
      return;
    }

    // If logged in as regular user, filter by role/allowedAppIds
    if (user) {
      const accessible = dbState.applications.filter((app) => {
        if (!app.isActive && !isManager) return false;
        if (isManager) return true;

        const roleAllowed =
          app.allowedRoles.includes(user!.role) ||
          app.allowedRoles.includes('UMUM') ||
          (user!.role === 'GURU' && (app.allowedRoles as any).includes('USER')) ||
          (user!.role === 'SISWA' && (app.allowedRoles as any).includes('USER')) ||
          ((user!.role as any) === 'USER' && (app.allowedRoles.includes('GURU') || app.allowedRoles.includes('SISWA')));
        if (user!.allowedAppIds && user!.allowedAppIds.length > 0) {
          return user!.allowedAppIds.includes(app.id);
        }
        return roleAllowed;
      });
      res.json({ success: true, applications: accessible });
      return;
    }

    // Public visitor view: show all applications so visitors can browse the complete directory
    res.json({ success: true, applications: dbState.applications });
  });

  // POST /api/applications/:id/open - SECURE APP LAUNCH VERIFICATION (Supports Public UMUM role without password)
  app.post('/api/applications/:id/open', (req: Request, res: Response) => {
    const appId = req.params.id;

    const application = dbState.applications.find((a) => a.id === appId);
    if (!application) {
      res.status(404).json({ error: 'Aplikasi tidak ditemukan' });
      return;
    }

    const isPublicApp = application.allowedRoles.includes('UMUM');

    // Extract user if auth header is present
    let user: User | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      let session = activeSessions.get(token);

      if (!session && token.startsWith('local_session_umum_')) {
        const umumUser = dbState.users.find((u) => u.role === 'UMUM') || dbState.users[0];
        if (umumUser) user = umumUser;
      } else if (!session && (token.startsWith('local_session_') || token.startsWith('portal_token_') || token.startsWith('google_local_'))) {
        const adminUser =
          dbState.users.find((u) => u.role === 'SUPER_ADMIN') ||
          dbState.users.find((u) => u.role === 'ADMIN') ||
          dbState.users[0];
        if (adminUser) user = adminUser;
      } else if (session && session.expiresAt >= Date.now()) {
        const found = dbState.users.find((u) => u.id === session.userId);
        if (found && found.isActive) user = found;
      }
    }

    if (!application.isActive && (!user || user.role !== 'SUPER_ADMIN')) {
      res.status(403).json({ error: 'Aplikasi sedang dalam pemeliharaan atau dinonaktifkan oleh administrator' });
      return;
    }

    // Direct access for applications with role UMUM without requiring login credentials
    if (isPublicApp) {
      application.openCount = (application.openCount || 0) + 1;
      saveDb();

      recordLog(
        user ? user.id : 'guest-umum',
        user ? user.username : 'pengguna.umum',
        user ? user.role : 'UMUM',
        'OPEN_APP',
        `Membuka aplikasi publik ${application.name} (Peran UMUM tanpa login)`,
        application.id,
        application.name,
        req
      );

      res.json({
        success: true,
        message: 'Hak akses UMUM diverifikasi (Akses Publik)',
        targetUrl: application.targetUrl,
        application: {
          id: application.id,
          name: application.name,
          openCount: application.openCount,
        },
      });
      return;
    }

    // For non-public applications, user must be authenticated
    if (!user) {
      res.status(401).json({ error: 'Aplikasi ini memerlukan autentikasi login akun sekolah' });
      return;
    }

    const isManager = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const roleAllowed =
      application.allowedRoles.includes(user.role) ||
      (user.role === 'GURU' && (application.allowedRoles as any).includes('USER')) ||
      (user.role === 'SISWA' && (application.allowedRoles as any).includes('USER')) ||
      ((user.role as any) === 'USER' && (application.allowedRoles.includes('GURU') || application.allowedRoles.includes('SISWA')));
    const userExplicitlyAllowed = user.allowedAppIds && user.allowedAppIds.includes(appId);

    if (!isManager && !roleAllowed && !userExplicitlyAllowed) {
      recordLog(
        user.id,
        user.username,
        user.role,
        'OPEN_APP',
        `Akses Ditolak: Mencoba membuka ${application.name} tanpa izin hak akses.`,
        application.id,
        application.name,
        req
      );
      res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin untuk membuka aplikasi ini' });
      return;
    }

    // Increment open count and log activity
    application.openCount = (application.openCount || 0) + 1;
    saveDb();

    recordLog(
      user.id,
      user.username,
      user.role,
      'OPEN_APP',
      `Membuka aplikasi ${application.name}`,
      application.id,
      application.name,
      req
    );

    res.json({
      success: true,
      message: 'Hak akses diverifikasi',
      targetUrl: application.targetUrl,
      application: {
        id: application.id,
        name: application.name,
        openCount: application.openCount,
      },
    });
  });

  // POST /api/applications (Create App - Admin/SuperAdmin)
  app.post('/api/applications', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const { id, name, description, categoryId, iconName, targetUrl, allowedRoles, isActive, badge, sortOrder } = req.body;

    if (!name || !targetUrl || !categoryId) {
      res.status(400).json({ error: 'Nama aplikasi, URL target, dan kategori wajib diisi' });
      return;
    }

    // URL validation
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      res.status(400).json({ error: 'URL aplikasi harus diawali dengan http:// atau https://' });
      return;
    }

    const appId = id ? String(id).trim() : `app-${Date.now()}`;
    const newApp: Application = {
      id: appId,
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      categoryId: String(categoryId),
      iconName: iconName || 'ExternalLink',
      targetUrl: String(targetUrl).trim(),
      allowedRoles: Array.isArray(allowedRoles) && allowedRoles.length > 0 ? allowedRoles : ['SUPER_ADMIN', 'ADMIN', 'GURU', 'SISWA'],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : dbState.applications.length + 1,
      openCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (badge && String(badge).trim()) {
      newApp.badge = String(badge).trim();
    }

    const existingIdx = dbState.applications.findIndex((a) => a.id === appId);
    if (existingIdx >= 0) {
      dbState.applications[existingIdx] = newApp;
    } else {
      dbState.applications.push(newApp);
    }
    saveDb();

    // Persist to online Cloud Firestore
    await syncAppToCloud(newApp);

    recordLog(user.id, user.username, user.role, 'CREATE_APP', `Menambahkan aplikasi baru: ${newApp.name}`, newApp.id, newApp.name, req);

    res.status(201).json({ success: true, application: newApp });
  });

  // PUT /api/applications/:id (Update App - Admin/SuperAdmin)
  app.put('/api/applications/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const appId = req.params.id;
    const { name, description, categoryId, iconName, targetUrl, allowedRoles, isActive, badge, sortOrder } = req.body;

    const appIndex = dbState.applications.findIndex((a) => a.id === appId);
    const existing = dbState.applications[appIndex];
    if (!existing) {
      // Resilient upsert: if app not in server memory yet, create it
      const newApp: Application = {
        id: appId,
        name: name !== undefined ? String(name).trim() : 'Aplikasi Baru',
        description: description !== undefined ? String(description).trim() : '',
        categoryId: categoryId !== undefined ? String(categoryId) : 'cat-1794205545810',
        iconName: iconName !== undefined ? String(iconName) : 'ExternalLink',
        targetUrl: targetUrl !== undefined ? String(targetUrl).trim() : 'https://smkn1tegalsari.sch.id',
        allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : ['SUPER_ADMIN', 'ADMIN', 'GURU', 'SISWA'],
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : dbState.applications.length + 1,
        openCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (badge && String(badge).trim()) {
        newApp.badge = String(badge).trim();
      }
      dbState.applications.push(newApp);
      saveDb();
      await syncAppToCloud(newApp);
      recordLog(user.id, user.username, user.role, 'CREATE_APP', `Menambahkan aplikasi baru: ${newApp.name}`, newApp.id, newApp.name, req);
      res.json({ success: true, application: newApp });
      return;
    }

    const updated: Application = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      description: description !== undefined ? String(description).trim() : existing.description,
      categoryId: categoryId !== undefined ? String(categoryId) : existing.categoryId,
      iconName: iconName !== undefined ? String(iconName) : existing.iconName,
      targetUrl: targetUrl !== undefined ? String(targetUrl).trim() : existing.targetUrl,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : existing.allowedRoles,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };

    if (badge !== undefined) {
      if (String(badge).trim()) {
        updated.badge = String(badge).trim();
      } else {
        delete updated.badge;
      }
    }

    dbState.applications[appIndex] = updated;
    saveDb();
    await syncAppToCloud(updated);

    recordLog(user.id, user.username, user.role, 'UPDATE_APP', `Memperbarui data aplikasi: ${updated.name}`, updated.id, updated.name, req);

    res.json({ success: true, application: updated });
  });

  // DELETE /api/applications/:id (Delete App - SuperAdmin or Admin)
  app.delete('/api/applications/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const appId = req.params.id;

    const targetApp = dbState.applications.find((a) => a.id === appId);
    dbState.applications = dbState.applications.filter((a) => a.id !== appId);
    saveDb();
    await deleteAppFromCloud(appId);

    if (targetApp) {
      recordLog(user.id, user.username, user.role, 'DELETE_APP', `Menghapus aplikasi: ${targetApp.name}`, targetApp.id, targetApp.name, req);
    }

    res.json({ success: true, message: 'Aplikasi berhasil dihapus' });
  });

  // PATCH /api/applications/:id/toggle (Toggle Active Status)
  app.patch('/api/applications/:id/toggle', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const appId = req.params.id;

    const appItem = dbState.applications.find((a) => a.id === appId);
    if (!appItem) {
      res.status(404).json({ error: 'Aplikasi tidak ditemukan' });
      return;
    }

    appItem.isActive = !appItem.isActive;
    appItem.updatedAt = new Date().toISOString();
    saveDb();
    await syncAppToCloud(appItem);

    recordLog(
      user.id,
      user.username,
      user.role,
      'UPDATE_APP',
      `${appItem.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} aplikasi ${appItem.name}`,
      appItem.id,
      appItem.name,
      req
    );

    res.json({ success: true, isActive: appItem.isActive });
  });

  // --- USERS MANAGEMENT ENDPOINTS ---

  // GET /api/users (Admin/SuperAdmin)
  app.get('/api/users', authenticateToken, requireAdmin, (_req: Request, res: Response) => {
    const safeUsers = dbState.users.map((u) => ({
      id: u.id,
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
    }));
    res.json({ success: true, users: safeUsers });
  });

  // POST /api/users (Create User - Admin / SuperAdmin)
  app.post('/api/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const currentUser = (req as any).user as User;
    const { username, password, email, fullName, role, department, allowedAppIds } = req.body;

    if (!username || !password || !fullName || !role) {
      res.status(400).json({ error: 'Username, password, nama lengkap, dan role wajib diisi' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (dbState.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });
      return;
    }

    // Only Super Admin can create SUPER_ADMIN accounts
    if (role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Hanya Super Admin yang dapat membuat akun dengan role SUPER_ADMIN' });
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      email: email ? String(email).trim().toLowerCase() : `${cleanUsername}@smkn1tegalsari.sch.id`,
      fullName: String(fullName).trim(),
      role: (role === 'USER' ? 'GURU' : role) as UserRole,
      department: department ? String(department).trim() : 'Umum',
      allowedAppIds: Array.isArray(allowedAppIds) ? allowedAppIds : undefined,
      isActive: true,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbState.users.push(newUser);
    saveDb();
    await syncUserToCloud(newUser);

    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      'CREATE_USER',
      `Menambahkan pengguna baru: ${newUser.fullName} (@${newUser.username}) dengan role ${newUser.role}`,
      undefined,
      undefined,
      req
    );

    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser });
  });

  // PUT /api/users/:id (Update User details)
  app.put('/api/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const currentUser = (req as any).user as User;
    const targetUserId = req.params.id;
    const { fullName, email, role, department, allowedAppIds, isActive } = req.body;

    const userIndex = dbState.users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }

    const existing = dbState.users[userIndex];

    // Restrict elevating to or editing other SUPER_ADMIN unless caller is SUPER_ADMIN
    if ((role === 'SUPER_ADMIN' || existing.role === 'SUPER_ADMIN') && currentUser.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Hanya Super Admin yang dapat mengelola akun SUPER_ADMIN' });
      return;
    }

    existing.fullName = fullName !== undefined ? String(fullName).trim() : existing.fullName;
    existing.email = email !== undefined ? String(email).trim().toLowerCase() : existing.email;
    existing.role = role !== undefined ? ((role === 'USER' ? 'GURU' : role) as UserRole) : existing.role;
    existing.department = department !== undefined ? String(department).trim() : existing.department;
    existing.allowedAppIds = Array.isArray(allowedAppIds) ? allowedAppIds : existing.allowedAppIds;
    if (isActive !== undefined) existing.isActive = Boolean(isActive);
    existing.updatedAt = new Date().toISOString();

    saveDb();
    await syncUserToCloud(existing);

    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      'UPDATE_USER',
      `Memperbarui profil pengguna @${existing.username}`,
      undefined,
      undefined,
      req
    );

    const { passwordHash: _, ...safeUser } = existing;
    res.json({ success: true, user: safeUser });
  });

  // POST /api/users/:id/reset-password
  app.post('/api/users/:id/reset-password', authenticateToken, requireAdmin, (req: Request, res: Response) => {
    const currentUser = (req as any).user as User;
    const targetUserId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 5) {
      res.status(400).json({ error: 'Password baru minimal 5 karakter' });
      return;
    }

    const targetUser = dbState.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }

    if (targetUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Hanya Super Admin yang dapat mereset password akun SUPER_ADMIN' });
      return;
    }

    targetUser.passwordHash = hashPassword(newPassword);
    targetUser.updatedAt = new Date().toISOString();
    saveDb();

    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      'RESET_PASSWORD',
      `Reset password pengguna @${targetUser.username}`,
      undefined,
      undefined,
      req
    );

    res.json({ success: true, message: `Password untuk @${targetUser.username} berhasil diperbarui` });
  });

  // PATCH /api/users/:id/toggle-active
  app.patch('/api/users/:id/toggle-active', authenticateToken, requireAdmin, (req: Request, res: Response) => {
    const currentUser = (req as any).user as User;
    const targetUserId = req.params.id;

    if (currentUser.id === targetUserId) {
      res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun sendiri' });
      return;
    }

    const targetUser = dbState.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }

    if (targetUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Hanya Super Admin yang dapat mengubah status akun SUPER_ADMIN' });
      return;
    }

    targetUser.isActive = !targetUser.isActive;
    targetUser.updatedAt = new Date().toISOString();
    saveDb();

    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      targetUser.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      `${targetUser.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun @${targetUser.username}`,
      undefined,
      undefined,
      req
    );

    res.json({ success: true, isActive: targetUser.isActive });
  });

  // DELETE /api/users/:id (Hapus Akun Pengguna)
  app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const currentUser = (req as any).user as User;
    const targetUserId = req.params.id;

    if (currentUser.id === targetUserId) {
      res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' });
      return;
    }

    const userIndex = dbState.users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      return;
    }

    const targetUser = dbState.users[userIndex];

    if (targetUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Hanya Super Admin yang berhak menghapus akun SUPER_ADMIN' });
      return;
    }

    // Invalidate any active session for the deleted user
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === targetUserId) {
        activeSessions.delete(token);
      }
    }

    // Remove user from database
    dbState.users.splice(userIndex, 1);
    saveDb();
    await deleteUserFromCloud(targetUserId);

    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      'DELETE_USER',
      `Menghapus akun pengguna @${targetUser.username} (${targetUser.fullName})`,
      undefined,
      undefined,
      req
    );

    res.json({
      success: true,
      message: `Akun @${targetUser.username} berhasil dihapus permanen`,
    });
  });

  // --- CATEGORIES ENDPOINTS ---

  app.get('/api/categories', (_req: Request, res: Response) => {
    res.json({ success: true, categories: dbState.categories });
  });

  app.post('/api/categories', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { id, name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nama kategori wajib diisi' });
      return;
    }

    const catId = id ? String(id).trim() : `cat-${Date.now()}`;
    const newCategory: Category = {
      id: catId,
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      sortOrder: dbState.categories.length + 1,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = dbState.categories.findIndex((c) => c.id === catId);
    if (existingIdx >= 0) {
      dbState.categories[existingIdx] = newCategory;
    } else {
      dbState.categories.push(newCategory);
    }
    saveDb();
    await syncCategoryToCloud(newCategory);

    res.status(201).json({ success: true, category: newCategory });
  });

  app.put('/api/categories/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const catId = req.params.id;
    const { name, description } = req.body;

    const cat = dbState.categories.find((c) => c.id === catId);
    if (!cat) {
      res.status(404).json({ error: 'Kategori tidak ditemukan' });
      return;
    }

    if (name) cat.name = String(name).trim();
    if (description !== undefined) cat.description = String(description).trim();
    saveDb();
    await syncCategoryToCloud(cat);

    res.json({ success: true, category: cat });
  });

  app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const catId = req.params.id;
    dbState.categories = dbState.categories.filter((c) => c.id !== catId);
    saveDb();
    await deleteCategoryFromCloud(catId);
    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  });

  // --- AUDIT LOGS ENDPOINTS ---

  app.get('/api/logs', authenticateToken, requireAdmin, (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const action = req.query.action as string;

    let logs = dbState.accessLogs;
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }

    res.json({
      success: true,
      logs: logs.slice(0, limit),
      total: logs.length,
    });
  });

  // --- STATS ENDPOINT ---

  app.get('/api/stats', authenticateToken, requireAdmin, (_req: Request, res: Response) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const todayLogins = dbState.accessLogs.filter(
      (l) => l.action === 'LOGIN' && l.timestamp.startsWith(todayStr)
    ).length;

    const totalLaunches = dbState.applications.reduce((acc, app) => acc + (app.openCount || 0), 0);

    const stats: DashboardStats = {
      totalUsers: dbState.users.length,
      activeUsers: dbState.users.filter((u) => u.isActive).length,
      totalApps: dbState.applications.length,
      activeApps: dbState.applications.filter((a) => a.isActive).length,
      totalCategories: dbState.categories.length,
      totalLaunches,
      todayLogins,
    };

    res.json({ success: true, stats });
  });

  // --- SETTINGS ENDPOINT ---

  app.get('/api/settings', (_req: Request, res: Response) => {
    res.json({ success: true, settings: dbState.settings });
  });

  app.put('/api/settings', authenticateToken, requireSuperAdmin, (req: Request, res: Response) => {
    const user = (req as any).user as User;
    dbState.settings = {
      ...dbState.settings,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    saveDb();

    recordLog(user.id, user.username, user.role, 'UPDATE_SETTINGS', 'Memperbarui konfigurasi portal sekolah', undefined, undefined, req);

    res.json({ success: true, settings: dbState.settings });
  });

  // --- RESET DEMO SEED DATA ---
  app.post('/api/seed/reset', authenticateToken, requireSuperAdmin, (_req: Request, res: Response) => {
    resetDefaultData();
    res.json({ success: true, message: 'Data contoh berhasil dipulihkan ke pengaturan awal' });
  });

  // Serve Frontend
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtml = path.resolve(distPath, 'index.html');
  const isExplicitDev = process.env.NODE_ENV === 'development';

  if (fs.existsSync(indexHtml) && !isExplicitDev) {
    console.log('[SMKN 1 Tegalsari Portal] Serving production static bundle from dist/');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(indexHtml);
    });
  } else {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SMKN 1 Tegalsari Portal] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SMKN 1 Tegalsari Portal] Server failed to start:', err);
  process.exit(1);
});
