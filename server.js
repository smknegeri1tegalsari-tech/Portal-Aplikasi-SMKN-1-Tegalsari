// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// src/lib/schoolData.ts
var INITIAL_CATEGORIES = [
  {
    id: "cat-akademik",
    name: "Akademik & Pembelajaran",
    description: "Sistem ujian, e-learning, jurnal mengajar, dan kurikulum sekolah",
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "cat-kesiswaan",
    name: "Kesiswaan & Bimbingan",
    description: "Data kesiswaan, absensi siswa, kedisiplinan, dan ekstrakurikuler",
    sortOrder: 2,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "cat-sarpras",
    name: "Sarana & Prasarana",
    description: "Inventaris bengkel, laboratorium, ruang kelas, dan aset sekolah",
    sortOrder: 3,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "cat-kepegawaian",
    name: "Kepegawaian & SDM",
    description: "Data pendidik, tenaga kependidikan, SKP, dan administrasi guru",
    sortOrder: 4,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "cat-administrasi",
    name: "Administrasi & Layanan",
    description: "Tata usaha, surat menyurat, perpustakaan, dan arsip digital",
    sortOrder: 5,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
var INITIAL_APPLICATIONS = [
  {
    id: "app-sis",
    name: "Sistem Informasi Sekolah",
    description: "Pusat integrasi informasi umum, kalender akademik, berita, dan pengumuman resmi SMKN 1 Tegalsari.",
    categoryId: "cat-administrasi",
    iconName: "GraduationCap",
    targetUrl: "https://sis.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "USER"],
    isActive: true,
    sortOrder: 1,
    openCount: 142,
    badge: "Utama",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-sisarpras",
    name: "SISARPRAS SMKN 1 Tegalsari",
    description: "Sistem Informasi Sarana dan Prasarana sekolah, peminjaman alat praktik, inventaris bengkel dan lab.",
    categoryId: "cat-sarpras",
    iconName: "Building2",
    targetUrl: "https://sarpras.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    isActive: true,
    sortOrder: 2,
    openCount: 89,
    badge: "Internal",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-semakasari",
    name: "Aplikasi Ujian SEMAKASARI",
    description: "Portal Computer Based Test (CBT) resmi SMKN 1 Tegalsari untuk Penilaian Akhir Semester dan Asesmen Sumatif.",
    categoryId: "cat-akademik",
    iconName: "Laptop",
    targetUrl: "https://cbt.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "USER"],
    isActive: true,
    sortOrder: 3,
    openCount: 512,
    badge: "CBT Ujian",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-esiska",
    name: "Aplikasi e-SISKA",
    description: "Sistem Informasi Praktik Kerja Lapangan (PKL), monitoring industri siswa vokasi, dan sertifikasi keahlian.",
    categoryId: "cat-kesiswaan",
    iconName: "Briefcase",
    targetUrl: "https://eslska.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "USER"],
    isActive: true,
    sortOrder: 4,
    openCount: 231,
    badge: "Vokasi/PKL",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-kepegawaian",
    name: "Sistem Informasi Kepegawaian",
    description: "Manajemen berkas kepegawaian GTK, SK pembagian tugas mengajar, angka kredit, dan kenaikan pangkat.",
    categoryId: "cat-kepegawaian",
    iconName: "Users",
    targetUrl: "https://simpeg.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    isActive: true,
    sortOrder: 5,
    openCount: 97,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-data-siswa",
    name: "Aplikasi Manajemen Data Siswa",
    description: "Basis data terpadu profil peserta didik, data orang tua/wali, rekapitulasi NISN, dan riwayat mutasi.",
    categoryId: "cat-kesiswaan",
    iconName: "FolderCheck",
    targetUrl: "https://kesiswaan.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    isActive: true,
    sortOrder: 6,
    openCount: 164,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-perpustakaan",
    name: "Aplikasi Perpustakaan",
    description: "Sistem Otomasi Perpustakaan (SLiMS), katalog buku teks, modul praktik kejuruan, dan peminjaman online.",
    categoryId: "cat-administrasi",
    iconName: "BookOpen",
    targetUrl: "https://perpus.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "USER"],
    isActive: true,
    sortOrder: 7,
    openCount: 188,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-jurnal-guru",
    name: "Aplikasi Jurnal Guru",
    description: "Pencatatan agenda harian tatap muka pengajaran, capaian modul ajar, dan catatan perkembangan peserta didik.",
    categoryId: "cat-akademik",
    iconName: "FileText",
    targetUrl: "https://jurnal.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "USER"],
    isActive: true,
    sortOrder: 8,
    openCount: 304,
    badge: "Harian GTK",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-absensi",
    name: "Aplikasi Absensi",
    description: "Presensi digital real-time berbasis QR Code / geolokasi untuk guru, karyawan, dan seluruh siswa.",
    categoryId: "cat-kesiswaan",
    iconName: "Clock",
    targetUrl: "https://presensi.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN", "USER"],
    isActive: true,
    sortOrder: 9,
    openCount: 840,
    badge: "Presensi Harian",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "app-administrasi",
    name: "Aplikasi Administrasi Sekolah",
    description: "Sistem surat menyurat digital, disposisi kepala sekolah, pengarsipan berkas dinas, dan ketatausahaan.",
    categoryId: "cat-administrasi",
    iconName: "ShieldCheck",
    targetUrl: "https://tu.smkn1tegalsari.sch.id",
    allowedRoles: ["SUPER_ADMIN", "ADMIN"],
    isActive: true,
    sortOrder: 10,
    openCount: 112,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];
var INITIAL_SETTINGS = {
  id: "global-settings",
  schoolName: "SMK NEGERI 1 TEGALSARI",
  portalTitle: "PORTAL TERPADU APLIKASI",
  tagline: "Satu Gerbang Akses Seluruh Layanan & Sistem Informasi Sekolah",
  logoUrl: "/assets/aistudio/Logo_SMK_Negeri_1_Tegalsari_200x200_ce1ff52b.jpg",
  address: "Jl. KH. Abdul Majid No. 09, Tegalsari, Kec. Tegalsari, Kab. Banyuwangi, Jawa Timur 68491",
  contactHelpdesk: "helpdesk@smkn1tegalsari.sch.id | (0333) 2811000",
  maintenanceMode: false,
  allowSelfRegistration: false,
  announcementText: "Selamat datang di Portal Terpadu SMKN 1 Tegalsari. Pastikan selalu logout setelah selesai menggunakan aplikasi.",
  updatedAt: "2026-01-01T00:00:00.000Z"
};
var INITIAL_USERS = [
  {
    id: "user-superadmin",
    username: "superadmin",
    email: "smknegeri1tegalsari@gmail.com",
    fullName: "Drs. H. Administrator Utama",
    role: "SUPER_ADMIN",
    department: "Manajemen Puncak & Tim IT",
    isActive: true,
    initialPassword: "admin123",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "user-admin",
    username: "admin",
    email: "admin.it@smkn1tegalsari.sch.id",
    fullName: "Bambang Irawan, S.Kom.",
    role: "ADMIN",
    department: "Pengelola IT & Jaringan",
    isActive: true,
    initialPassword: "admin123",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "user-guru",
    username: "guru.ahmad",
    email: "ahmad.fauzi@smkn1tegalsari.sch.id",
    fullName: "Ahmad Fauzi, S.Pd.",
    role: "USER",
    department: "Tenaga Pendidik / Guru Produktif",
    isActive: true,
    initialPassword: "guru123",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "user-siswa",
    username: "siswa.budi",
    email: "budi.santoso@siswa.smkn1tegalsari.sch.id",
    fullName: "Budi Santoso (XII RPL 1)",
    role: "USER",
    department: "Siswa / Rekayasa Perangkat Lunak",
    isActive: true,
    initialPassword: "siswa123",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = parseInt(process.env.DEFAULT_APP_PORT || "3000", 10);
var DB_FILE = path.join(__dirname, ".data-portal.json");
function hashPassword(password, salt = "smkn1tegalsari_salt") {
  return crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
}
var dbState = {
  users: [],
  applications: [],
  categories: [],
  accessLogs: [],
  settings: INITIAL_SETTINGS
};
var activeSessions = /* @__PURE__ */ new Map();
function ensureDefaultUsers() {
  if (!dbState.users || dbState.users.length === 0) {
    resetDefaultData();
    return;
  }
  const defaultHash = hashPassword("admin123");
  let superadmin = dbState.users.find(
    (u) => u.username.toLowerCase() === "superadmin" || u.email.toLowerCase() === "smknegeri1tegalsari@gmail.com"
  );
  if (!superadmin) {
    dbState.users.unshift({
      id: "user-superadmin",
      username: "superadmin",
      email: "smknegeri1tegalsari@gmail.com",
      fullName: "Drs. H. Administrator Utama",
      role: "SUPER_ADMIN",
      department: "Manajemen Puncak & Tim IT",
      isActive: true,
      passwordHash: defaultHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveDb();
  } else if (!superadmin.passwordHash) {
    superadmin.passwordHash = defaultHash;
    saveDb();
  }
  let admin = dbState.users.find((u) => u.username.toLowerCase() === "admin");
  if (!admin) {
    dbState.users.push({
      id: "user-admin",
      username: "admin",
      email: "admin.it@smkn1tegalsari.sch.id",
      fullName: "Bambang Irawan, S.Kom.",
      role: "ADMIN",
      department: "Pengelola IT & Jaringan",
      isActive: true,
      passwordHash: defaultHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveDb();
  }
}
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      dbState = JSON.parse(raw);
      ensureDefaultUsers();
      console.log(`[Database] Loaded existing database with ${dbState.applications.length} apps, ${dbState.users.length} users.`);
      return;
    }
  } catch (err) {
    console.warn("[Database] Could not read file, re-initializing default data:", err);
  }
  resetDefaultData();
}
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("[Database] Failed to write database file:", err);
  }
}
function resetDefaultData() {
  const usersWithHash = INITIAL_USERS.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    department: u.department,
    isActive: u.isActive,
    passwordHash: hashPassword(u.initialPassword || "admin123"),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));
  dbState = {
    users: usersWithHash,
    applications: [...INITIAL_APPLICATIONS],
    categories: [...INITIAL_CATEGORIES],
    accessLogs: [
      {
        id: `log-${Date.now()}-init`,
        userId: "system",
        username: "system",
        role: "SUPER_ADMIN",
        action: "UPDATE_SETTINGS",
        details: "Sistem Portal Terpadu SMKN 1 Tegalsari diinisialisasi.",
        ipAddress: "127.0.0.1",
        userAgent: "Server-Init",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    settings: { ...INITIAL_SETTINGS }
  };
  saveDb();
  console.log("[Database] Seeded initial school applications and users.");
}
function recordLog(userId, username, role, action, details, targetAppId, targetAppName, req) {
  const ipAddress = req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "127.0.0.1";
  const userAgent = req?.headers["user-agent"] || "Unknown-Device";
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    username,
    role,
    action,
    details,
    targetAppId,
    targetAppName,
    ipAddress: ipAddress.split(",")[0].trim(),
    userAgent: userAgent.substring(0, 200),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbState.accessLogs.unshift(newLog);
  if (dbState.accessLogs.length > 1e3) {
    dbState.accessLogs = dbState.accessLogs.slice(0, 1e3);
  }
  saveDb();
  return newLog;
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Sesi tidak valid atau belum login" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ error: "Sesi telah kedaluwarsa, silakan login kembali" });
    return;
  }
  const user = dbState.users.find((u) => u.id === session.userId);
  if (!user || !user.isActive) {
    res.status(403).json({ error: "Akun Anda dinonaktifkan oleh administrator" });
    return;
  }
  req.user = user;
  req.token = token;
  next();
}
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Akses ditolak: Hanya Administrator yang berwenang" });
    return;
  }
  next();
}
function requireSuperAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Akses ditolak: Hanya Super Admin yang berwenang" });
    return;
  }
  next();
}
async function startServer() {
  loadDb();
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "PORTAL_TERPADU_SMKN1_TEGALSARI",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      port: PORT,
      usersCount: dbState.users.length,
      appsCount: dbState.applications.length
    });
  });
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username dan kata sandi wajib diisi" });
      return;
    }
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password);
    const trimmedPassword = cleanPassword.trim();
    const user = dbState.users.find(
      (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername
    );
    if (!user) {
      res.status(401).json({ error: "Username atau email tidak terdaftar di sistem portal" });
      return;
    }
    if (!user.isActive) {
      recordLog(user.id, user.username, user.role, "LOGIN", "Percobaan login ke akun yang dinonaktifkan", void 0, void 0, req);
      res.status(403).json({ error: "Akun Anda dinonaktifkan oleh administrator sekolah. Hubungi Tim IT SMKN 1 Tegalsari." });
      return;
    }
    const inputHash = hashPassword(cleanPassword);
    const trimmedHash = hashPassword(trimmedPassword);
    const isPasswordMatch = user.passwordHash === inputHash || user.passwordHash === trimmedHash;
    if (!isPasswordMatch) {
      recordLog(user.id, user.username, user.role, "LOGIN", "Gagal login: Kata sandi salah", void 0, void 0, req);
      res.status(401).json({ error: "Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda." });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
    activeSessions.set(token, { userId: user.id, expiresAt });
    user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    recordLog(user.id, user.username, user.role, "LOGIN", "Login berhasil melalui Portal Terpadu", void 0, void 0, req);
    const safeUser = {
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
      updatedAt: user.updatedAt
    };
    res.json({
      success: true,
      message: "Login berhasil",
      token,
      user: safeUser
    });
  });
  app.post("/api/auth/google", (req, res) => {
    const { email, fullName } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email Google wajib disertakan" });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    let user = dbState.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanEmail.split("@")[0]
    );
    const isSchoolAdminEmail = cleanEmail === "smknegeri1tegalsari@gmail.com";
    if (!user) {
      const usernameFromEmail = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "");
      const newRole = isSchoolAdminEmail ? "SUPER_ADMIN" : "USER";
      user = {
        id: `user-g-${Date.now()}`,
        username: usernameFromEmail || `user_${Date.now()}`,
        email: cleanEmail,
        fullName: fullName ? String(fullName).trim() : cleanEmail,
        role: newRole,
        department: isSchoolAdminEmail ? "Manajemen Puncak & Tim IT" : "Warga SMKN 1 Tegalsari",
        isActive: true,
        passwordHash: hashPassword(crypto.randomBytes(16).toString("hex")),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      dbState.users.push(user);
      saveDb();
      recordLog(
        user.id,
        user.username,
        user.role,
        "CREATE_USER",
        `Pendaftaran otomatis via Google Sign-In: ${user.fullName} (${user.email})`,
        void 0,
        void 0,
        req
      );
    }
    if (isSchoolAdminEmail) {
      user.role = "SUPER_ADMIN";
      user.isActive = true;
    }
    if (!user.isActive) {
      res.status(403).json({ error: "Akun Anda dinonaktifkan oleh administrator sekolah." });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1e3;
    activeSessions.set(token, { userId: user.id, expiresAt });
    user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    recordLog(user.id, user.username, user.role, "LOGIN", `Login sukses via Google Account: ${user.email}`, void 0, void 0, req);
    const safeUser = {
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
      updatedAt: user.updatedAt
    };
    res.json({
      success: true,
      message: "Login Google berhasil",
      token,
      user: safeUser
    });
  });
  app.get("/api/auth/session", authenticateToken, (req, res) => {
    const user = req.user;
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
        updatedAt: user.updatedAt
      }
    });
  });
  app.post("/api/auth/logout", authenticateToken, (req, res) => {
    const user = req.user;
    const token = req.token;
    if (token) {
      activeSessions.delete(token);
    }
    recordLog(user.id, user.username, user.role, "LOGOUT", "Pengguna melakukan logout", void 0, void 0, req);
    res.json({ success: true, message: "Logout berhasil" });
  });
  app.get("/api/applications", (req, res) => {
    const authHeader = req.headers.authorization;
    let user = null;
    let isManager = false;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const session = activeSessions.get(token);
      if (session && session.expiresAt >= Date.now()) {
        const found = dbState.users.find((u) => u.id === session.userId);
        if (found && found.isActive) {
          user = found;
          isManager = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
        }
      }
    }
    if (isManager && req.query.all === "true") {
      res.json({ success: true, applications: dbState.applications });
      return;
    }
    if (user) {
      const accessible = dbState.applications.filter((app2) => {
        if (!app2.isActive && !isManager) return false;
        if (isManager) return true;
        const roleAllowed = app2.allowedRoles.includes(user.role);
        if (user.allowedAppIds && user.allowedAppIds.length > 0) {
          return user.allowedAppIds.includes(app2.id);
        }
        return roleAllowed;
      });
      res.json({ success: true, applications: accessible });
      return;
    }
    res.json({ success: true, applications: dbState.applications });
  });
  app.post("/api/applications/:id/open", authenticateToken, (req, res) => {
    const user = req.user;
    const appId = req.params.id;
    const application = dbState.applications.find((a) => a.id === appId);
    if (!application) {
      res.status(404).json({ error: "Aplikasi tidak ditemukan" });
      return;
    }
    if (!application.isActive && user.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Aplikasi sedang dalam pemeliharaan atau dinonaktifkan oleh administrator" });
      return;
    }
    const isManager = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    const roleAllowed = application.allowedRoles.includes(user.role);
    const userExplicitlyAllowed = user.allowedAppIds && user.allowedAppIds.includes(appId);
    if (!isManager && !roleAllowed && !userExplicitlyAllowed) {
      recordLog(
        user.id,
        user.username,
        user.role,
        "OPEN_APP",
        `Akses Ditolak: Mencoba membuka ${application.name} tanpa izin hak akses.`,
        application.id,
        application.name,
        req
      );
      res.status(403).json({ error: "Akses ditolak: Anda tidak memiliki izin untuk membuka aplikasi ini" });
      return;
    }
    application.openCount = (application.openCount || 0) + 1;
    saveDb();
    recordLog(
      user.id,
      user.username,
      user.role,
      "OPEN_APP",
      `Membuka aplikasi ${application.name}`,
      application.id,
      application.name,
      req
    );
    res.json({
      success: true,
      message: "Hak akses diverifikasi",
      targetUrl: application.targetUrl,
      application: {
        id: application.id,
        name: application.name,
        openCount: application.openCount
      }
    });
  });
  app.post("/api/applications", authenticateToken, requireAdmin, (req, res) => {
    const user = req.user;
    const { name, description, categoryId, iconName, targetUrl, allowedRoles, isActive, badge } = req.body;
    if (!name || !targetUrl || !categoryId) {
      res.status(400).json({ error: "Nama aplikasi, URL target, dan kategori wajib diisi" });
      return;
    }
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      res.status(400).json({ error: "URL aplikasi harus diawali dengan http:// atau https://" });
      return;
    }
    const newApp = {
      id: `app-${Date.now()}`,
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      categoryId: String(categoryId),
      iconName: iconName || "ExternalLink",
      targetUrl: String(targetUrl).trim(),
      allowedRoles: Array.isArray(allowedRoles) && allowedRoles.length > 0 ? allowedRoles : ["SUPER_ADMIN", "ADMIN", "USER"],
      isActive: isActive !== void 0 ? Boolean(isActive) : true,
      sortOrder: dbState.applications.length + 1,
      openCount: 0,
      badge: badge ? String(badge).trim() : void 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.applications.push(newApp);
    saveDb();
    recordLog(user.id, user.username, user.role, "CREATE_APP", `Menambahkan aplikasi baru: ${newApp.name}`, newApp.id, newApp.name, req);
    res.status(201).json({ success: true, application: newApp });
  });
  app.put("/api/applications/:id", authenticateToken, requireAdmin, (req, res) => {
    const user = req.user;
    const appId = req.params.id;
    const { name, description, categoryId, iconName, targetUrl, allowedRoles, isActive, badge, sortOrder } = req.body;
    const appIndex = dbState.applications.findIndex((a) => a.id === appId);
    if (appIndex === -1) {
      res.status(404).json({ error: "Aplikasi tidak ditemukan" });
      return;
    }
    if (targetUrl && !targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      res.status(400).json({ error: "URL aplikasi harus diawali dengan http:// atau https://" });
      return;
    }
    const existing = dbState.applications[appIndex];
    const updated = {
      ...existing,
      name: name !== void 0 ? String(name).trim() : existing.name,
      description: description !== void 0 ? String(description).trim() : existing.description,
      categoryId: categoryId !== void 0 ? String(categoryId) : existing.categoryId,
      iconName: iconName !== void 0 ? String(iconName) : existing.iconName,
      targetUrl: targetUrl !== void 0 ? String(targetUrl).trim() : existing.targetUrl,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : existing.allowedRoles,
      isActive: isActive !== void 0 ? Boolean(isActive) : existing.isActive,
      sortOrder: sortOrder !== void 0 ? Number(sortOrder) : existing.sortOrder,
      badge: badge !== void 0 ? String(badge).trim() : existing.badge,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.applications[appIndex] = updated;
    saveDb();
    recordLog(user.id, user.username, user.role, "UPDATE_APP", `Memperbarui data aplikasi: ${updated.name}`, updated.id, updated.name, req);
    res.json({ success: true, application: updated });
  });
  app.delete("/api/applications/:id", authenticateToken, requireAdmin, (req, res) => {
    const user = req.user;
    const appId = req.params.id;
    const targetApp = dbState.applications.find((a) => a.id === appId);
    if (!targetApp) {
      res.status(404).json({ error: "Aplikasi tidak ditemukan" });
      return;
    }
    dbState.applications = dbState.applications.filter((a) => a.id !== appId);
    saveDb();
    recordLog(user.id, user.username, user.role, "DELETE_APP", `Menghapus aplikasi: ${targetApp.name}`, targetApp.id, targetApp.name, req);
    res.json({ success: true, message: "Aplikasi berhasil dihapus" });
  });
  app.patch("/api/applications/:id/toggle", authenticateToken, requireAdmin, (req, res) => {
    const user = req.user;
    const appId = req.params.id;
    const appItem = dbState.applications.find((a) => a.id === appId);
    if (!appItem) {
      res.status(404).json({ error: "Aplikasi tidak ditemukan" });
      return;
    }
    appItem.isActive = !appItem.isActive;
    appItem.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    recordLog(
      user.id,
      user.username,
      user.role,
      "UPDATE_APP",
      `${appItem.isActive ? "Mengaktifkan" : "Menonaktifkan"} aplikasi ${appItem.name}`,
      appItem.id,
      appItem.name,
      req
    );
    res.json({ success: true, isActive: appItem.isActive });
  });
  app.get("/api/users", authenticateToken, requireAdmin, (_req, res) => {
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
      updatedAt: u.updatedAt
    }));
    res.json({ success: true, users: safeUsers });
  });
  app.post("/api/users", authenticateToken, requireAdmin, (req, res) => {
    const currentUser = req.user;
    const { username, password, email, fullName, role, department, allowedAppIds } = req.body;
    if (!username || !password || !fullName || !role) {
      res.status(400).json({ error: "Username, password, nama lengkap, dan role wajib diisi" });
      return;
    }
    const cleanUsername = String(username).trim().toLowerCase();
    if (dbState.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      res.status(400).json({ error: "Username sudah digunakan oleh akun lain" });
      return;
    }
    if (role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Hanya Super Admin yang dapat membuat akun dengan role SUPER_ADMIN" });
      return;
    }
    const newUser = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      email: email ? String(email).trim().toLowerCase() : `${cleanUsername}@smkn1tegalsari.sch.id`,
      fullName: String(fullName).trim(),
      role,
      department: department ? String(department).trim() : "Umum",
      allowedAppIds: Array.isArray(allowedAppIds) ? allowedAppIds : void 0,
      isActive: true,
      passwordHash: hashPassword(password),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.users.push(newUser);
    saveDb();
    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      "CREATE_USER",
      `Menambahkan pengguna baru: ${newUser.fullName} (@${newUser.username}) dengan role ${newUser.role}`,
      void 0,
      void 0,
      req
    );
    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser });
  });
  app.put("/api/users/:id", authenticateToken, requireAdmin, (req, res) => {
    const currentUser = req.user;
    const targetUserId = req.params.id;
    const { fullName, email, role, department, allowedAppIds, isActive } = req.body;
    const userIndex = dbState.users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      res.status(404).json({ error: "Pengguna tidak ditemukan" });
      return;
    }
    const existing = dbState.users[userIndex];
    if ((role === "SUPER_ADMIN" || existing.role === "SUPER_ADMIN") && currentUser.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Hanya Super Admin yang dapat mengelola akun SUPER_ADMIN" });
      return;
    }
    existing.fullName = fullName !== void 0 ? String(fullName).trim() : existing.fullName;
    existing.email = email !== void 0 ? String(email).trim().toLowerCase() : existing.email;
    existing.role = role !== void 0 ? role : existing.role;
    existing.department = department !== void 0 ? String(department).trim() : existing.department;
    existing.allowedAppIds = Array.isArray(allowedAppIds) ? allowedAppIds : existing.allowedAppIds;
    if (isActive !== void 0) existing.isActive = Boolean(isActive);
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      "UPDATE_USER",
      `Memperbarui profil pengguna @${existing.username}`,
      void 0,
      void 0,
      req
    );
    const { passwordHash: _, ...safeUser } = existing;
    res.json({ success: true, user: safeUser });
  });
  app.post("/api/users/:id/reset-password", authenticateToken, requireAdmin, (req, res) => {
    const currentUser = req.user;
    const targetUserId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 5) {
      res.status(400).json({ error: "Password baru minimal 5 karakter" });
      return;
    }
    const targetUser = dbState.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: "Pengguna tidak ditemukan" });
      return;
    }
    if (targetUser.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Hanya Super Admin yang dapat mereset password akun SUPER_ADMIN" });
      return;
    }
    targetUser.passwordHash = hashPassword(newPassword);
    targetUser.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      "RESET_PASSWORD",
      `Reset password pengguna @${targetUser.username}`,
      void 0,
      void 0,
      req
    );
    res.json({ success: true, message: `Password untuk @${targetUser.username} berhasil diperbarui` });
  });
  app.patch("/api/users/:id/toggle-active", authenticateToken, requireAdmin, (req, res) => {
    const currentUser = req.user;
    const targetUserId = req.params.id;
    if (currentUser.id === targetUserId) {
      res.status(400).json({ error: "Anda tidak dapat menonaktifkan akun sendiri" });
      return;
    }
    const targetUser = dbState.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      res.status(404).json({ error: "Pengguna tidak ditemukan" });
      return;
    }
    if (targetUser.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Hanya Super Admin yang dapat mengubah status akun SUPER_ADMIN" });
      return;
    }
    targetUser.isActive = !targetUser.isActive;
    targetUser.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      targetUser.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      `${targetUser.isActive ? "Mengaktifkan" : "Menonaktifkan"} akun @${targetUser.username}`,
      void 0,
      void 0,
      req
    );
    res.json({ success: true, isActive: targetUser.isActive });
  });
  app.delete("/api/users/:id", authenticateToken, requireAdmin, (req, res) => {
    const currentUser = req.user;
    const targetUserId = req.params.id;
    if (currentUser.id === targetUserId) {
      res.status(400).json({ error: "Anda tidak dapat menghapus akun Anda sendiri" });
      return;
    }
    const userIndex = dbState.users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      res.status(404).json({ error: "Pengguna tidak ditemukan" });
      return;
    }
    const targetUser = dbState.users[userIndex];
    if (targetUser.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") {
      res.status(403).json({ error: "Hanya Super Admin yang berhak menghapus akun SUPER_ADMIN" });
      return;
    }
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === targetUserId) {
        activeSessions.delete(token);
      }
    }
    dbState.users.splice(userIndex, 1);
    saveDb();
    recordLog(
      currentUser.id,
      currentUser.username,
      currentUser.role,
      "DELETE_USER",
      `Menghapus akun pengguna @${targetUser.username} (${targetUser.fullName})`,
      void 0,
      void 0,
      req
    );
    res.json({
      success: true,
      message: `Akun @${targetUser.username} berhasil dihapus permanen`
    });
  });
  app.get("/api/categories", (_req, res) => {
    res.json({ success: true, categories: dbState.categories });
  });
  app.post("/api/categories", authenticateToken, requireAdmin, (req, res) => {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "Nama kategori wajib diisi" });
      return;
    }
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      sortOrder: dbState.categories.length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbState.categories.push(newCategory);
    saveDb();
    res.status(201).json({ success: true, category: newCategory });
  });
  app.put("/api/categories/:id", authenticateToken, requireAdmin, (req, res) => {
    const catId = req.params.id;
    const { name, description } = req.body;
    const cat = dbState.categories.find((c) => c.id === catId);
    if (!cat) {
      res.status(404).json({ error: "Kategori tidak ditemukan" });
      return;
    }
    if (name) cat.name = String(name).trim();
    if (description !== void 0) cat.description = String(description).trim();
    saveDb();
    res.json({ success: true, category: cat });
  });
  app.delete("/api/categories/:id", authenticateToken, requireAdmin, (req, res) => {
    const catId = req.params.id;
    dbState.categories = dbState.categories.filter((c) => c.id !== catId);
    saveDb();
    res.json({ success: true, message: "Kategori berhasil dihapus" });
  });
  app.get("/api/logs", authenticateToken, requireAdmin, (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const action = req.query.action;
    let logs = dbState.accessLogs;
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    res.json({
      success: true,
      logs: logs.slice(0, limit),
      total: logs.length
    });
  });
  app.get("/api/stats", authenticateToken, requireAdmin, (_req, res) => {
    const now = /* @__PURE__ */ new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayLogins = dbState.accessLogs.filter(
      (l) => l.action === "LOGIN" && l.timestamp.startsWith(todayStr)
    ).length;
    const totalLaunches = dbState.applications.reduce((acc, app2) => acc + (app2.openCount || 0), 0);
    const stats = {
      totalUsers: dbState.users.length,
      activeUsers: dbState.users.filter((u) => u.isActive).length,
      totalApps: dbState.applications.length,
      activeApps: dbState.applications.filter((a) => a.isActive).length,
      totalCategories: dbState.categories.length,
      totalLaunches,
      todayLogins
    };
    res.json({ success: true, stats });
  });
  app.get("/api/settings", (_req, res) => {
    res.json({ success: true, settings: dbState.settings });
  });
  app.put("/api/settings", authenticateToken, requireSuperAdmin, (req, res) => {
    const user = req.user;
    dbState.settings = {
      ...dbState.settings,
      ...req.body,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb();
    recordLog(user.id, user.username, user.role, "UPDATE_SETTINGS", "Memperbarui konfigurasi portal sekolah", void 0, void 0, req);
    res.json({ success: true, settings: dbState.settings });
  });
  app.post("/api/seed/reset", authenticateToken, requireSuperAdmin, (_req, res) => {
    resetDefaultData();
    res.json({ success: true, message: "Data contoh berhasil dipulihkan ke pengaturan awal" });
  });
  const distPath = path.resolve(__dirname, "dist");
  const isProduction = process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "start" || !fs.existsSync(path.resolve(__dirname, "vite.config.ts"));
  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SMKN 1 Tegalsari Portal] Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[SMKN 1 Tegalsari Portal] Server failed to start:", err);
  process.exit(1);
});
