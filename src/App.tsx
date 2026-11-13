/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  Star,
  Sparkles,
  School,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  BellRing,
  LogIn,
  Clock,
  Lock,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { AppCard } from './components/AppCard';
import { AppLaunchModal } from './components/AppLaunchModal';
import { OfficialLogo } from './components/OfficialLogo';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ApplicationManager } from './components/admin/ApplicationManager';
import { UserManager } from './components/admin/UserManager';
import { CategoryManager } from './components/admin/CategoryManager';
import { AccessMatrix } from './components/admin/AccessMatrix';
import { AuditLogs } from './components/admin/AuditLogs';
import { PortalSettingsView } from './components/admin/PortalSettingsView';
import { GuideView } from './components/GuideView';
import { Application, Category, PortalSettings } from './types';
import { SCHOOL_INFO } from './lib/schoolData';
import {
  getLocalApplications,
  saveLocalApplications,
  getLocalCategories,
  saveLocalCategories,
  getLocalSettings,
  saveLocalSettings,
  incrementAppOpenCount,
  addLocalLog,
} from './lib/portalStorage';
import {
  fetchCloudApplications,
  fetchCloudCategories,
  fetchCloudSettings,
  subscribeCloudApplications,
  subscribeCloudCategories,
  syncCloudApplication,
  recordCloudAccessLog,
} from './lib/firestoreSync';

const FAVORITES_STORAGE_KEY = 'portal_smkn1_fav_apps';

function PortalAppContent() {
  const { currentUser, token, isLoading, isAdmin, isSuperAdmin } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('catalog');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Flow control: Public showcase vs Login view
  const [showLoginView, setShowLoginView] = useState(false);
  const [pendingAppToOpen, setPendingAppToOpen] = useState<Application | null>(null);

  // Applications & Categories state initialized from local storage / seed
  const [applications, setApplications] = useState<Application[]>(() => getLocalApplications());
  const [categories, setCategories] = useState<Category[]>(() => getLocalCategories());
  const [settings, setSettings] = useState<PortalSettings>(() => getLocalSettings());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Realtime clock for public landing
  const [publicTime, setPublicTime] = useState<string>('');
  const [publicDate, setPublicDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPublicDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
      setPublicTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ['app-sis', 'app-semakasari'];
    } catch {
      return ['app-sis', 'app-semakasari'];
    }
  });

  // App Launch Modal
  const [selectedAppToOpen, setSelectedAppToOpen] = useState<Application | null>(null);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  // Fetch applications & categories (prioritizing live Cloud Firestore so published database is never overwritten)
  const loadPortalData = async () => {
    // 1. Immediately display cached local data for fast render
    setApplications(getLocalApplications());
    setCategories(getLocalCategories());
    setSettings(getLocalSettings());

    try {
      // 2. Fetch from Cloud Firestore (primary cloud database)
      const [cloudApps, cloudCats, cloudSettings] = await Promise.all([
        fetchCloudApplications().catch(() => null),
        fetchCloudCategories().catch(() => null),
        fetchCloudSettings().catch(() => null),
      ]);

      let cloudAppsFound = false;
      if (cloudApps !== null && Array.isArray(cloudApps)) {
        setApplications(cloudApps);
        saveLocalApplications(cloudApps);
        cloudAppsFound = true;
      }
      if (cloudCats !== null && Array.isArray(cloudCats) && cloudCats.length > 0) {
        setCategories(cloudCats);
        saveLocalCategories(cloudCats);
      }
      if (cloudSettings) {
        setSettings(cloudSettings);
        saveLocalSettings(cloudSettings);
      }

      // 3. Only query server if cloud data was not retrieved (offline fallback)
      if (!cloudAppsFound) {
        const headers: Record<string, string> = {};
        if (token && !token.startsWith('local_session_')) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const [resApps, resCats, resSettings] = await Promise.all([
          fetch(token ? '/api/applications?all=true' : '/api/applications', { headers }).catch(() => null),
          fetch('/api/categories').catch(() => null),
          fetch('/api/settings').catch(() => null),
        ]);

        if (resApps && resApps.ok) {
          const contentType = resApps.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await resApps.json();
            if (data.applications && Array.isArray(data.applications)) {
              setApplications(data.applications);
              saveLocalApplications(data.applications);
            }
          }
        }
        if (resCats && resCats.ok) {
          const contentType = resCats.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await resCats.json();
            if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
              setCategories(data.categories);
              saveLocalCategories(data.categories);
            }
          }
        }
        if (resSettings && resSettings.ok) {
          const contentType = resSettings.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await resSettings.json();
            if (data.settings) {
              setSettings(data.settings);
              saveLocalSettings(data.settings);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not load dynamic portal data, using local fallback:', err);
    }
  };

  useEffect(() => {
    loadPortalData();

    // 1. Fetch initial cloud data from Firestore
    fetchCloudApplications().then((cloudApps) => {
      if (cloudApps !== null && Array.isArray(cloudApps)) setApplications(cloudApps);
    });
    fetchCloudCategories().then((cloudCats) => {
      if (cloudCats && cloudCats.length > 0) setCategories(cloudCats);
    });
    fetchCloudSettings().then((cloudSettings) => {
      if (cloudSettings) setSettings(cloudSettings);
    });

    // 2. Real-time multi-device cloud synchronization listeners
    const unsubApps = subscribeCloudApplications((cloudApps) => {
      if (cloudApps !== null && Array.isArray(cloudApps)) {
        setApplications(cloudApps);
      }
    });

    const unsubCats = subscribeCloudCategories((cloudCats) => {
      if (cloudCats && cloudCats.length > 0) {
        setCategories(cloudCats);
      }
    });

    return () => {
      unsubApps();
      unsubCats();
    };
  }, [token]);

  // When user successfully logs in, if they clicked an app previously, auto-launch it!
  useEffect(() => {
    if (currentUser && pendingAppToOpen) {
      setSelectedAppToOpen(pendingAppToOpen);
      setIsLaunchModalOpen(true);
      setPendingAppToOpen(null);
      setShowLoginView(false);
    }
  }, [currentUser, pendingAppToOpen]);

  // Save favorites
  const toggleFavorite = (appId: string) => {
    setFavoriteIds((prev) => {
      const updated = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Launch handler
  const handleOpenApp = (app: Application) => {
    // If app has role UMUM and user is visitor/UMUM, record open count & audit log in background while <a> opens targetUrl directly
    if (app.allowedRoles.includes('UMUM') && (!currentUser || currentUser.role === 'UMUM')) {
      const nextCount = (app.openCount || 0) + 1;
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, openCount: nextCount } : a))
      );
      incrementAppOpenCount(app.id);
      addLocalLog({
        userId: currentUser?.id || 'guest-umum',
        username: currentUser?.username || 'pengguna.umum',
        role: 'UMUM',
        action: 'OPEN_APP',
        details: `Membuka langsung aplikasi publik ${app.name} (Tanpa Login)`,
        targetAppId: app.id,
        targetAppName: app.name,
      });
      syncCloudApplication({ ...app, openCount: nextCount, updatedAt: new Date().toISOString() }).catch(() => {});
      recordCloudAccessLog({
        userId: currentUser?.id || 'guest-umum',
        username: currentUser?.username || 'pengguna.umum',
        role: 'UMUM',
        action: 'OPEN_APP',
        details: `Membuka langsung aplikasi publik ${app.name} (Tanpa Login)`,
        targetAppId: app.id,
        targetAppName: app.name,
      }).catch(() => {});
      fetch(`/api/applications/${app.id}/open`, { method: 'POST' }).catch(() => {});
      return;
    }

    if (!currentUser) {
      // User is not logged in and application requires role authentication: redirect to login
      setPendingAppToOpen(app);
      setShowLoginView(true);
    } else {
      // Authenticated: verify and launch
      setSelectedAppToOpen(app);
      setIsLaunchModalOpen(true);
    }
  };

  // Filter accessible apps based on role
  const isManager = isAdmin || isSuperAdmin;
  const userFilteredApps = applications.filter((app) => {
    if (!currentUser) {
      // Public view shows all active applications
      return app.isActive;
    }
    if (!app.isActive && !isManager) return false;
    if (isManager) return true;

    const roleAllowed = currentUser
      ? app.allowedRoles.includes(currentUser.role) || app.allowedRoles.includes('UMUM')
      : app.allowedRoles.includes('UMUM');
    const explicitlyAllowed = currentUser?.allowedAppIds ? currentUser.allowedAppIds.includes(app.id) : false;
    return roleAllowed || explicitlyAllowed;
  });

  // Search and category filtering
  const displayedApps = userFilteredApps.filter((app) => {
    const matchSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.targetUrl.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = activeCategoryId === 'all' || app.categoryId === activeCategoryId;
    return matchSearch && matchCategory;
  });

  const favoriteApps = userFilteredApps.filter((app) => favoriteIds.includes(app.id));

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f4f2] text-slate-900 p-4">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center shadow-lg">
            <OfficialLogo size="md" />
          </div>
          <div className="absolute inset-0 border-2 border-emerald-500/30 border-t-emerald-600 rounded-3xl animate-spin" />
        </div>
        <h2 className="text-sm font-extrabold text-slate-900 tracking-widest uppercase">
          Portal Terpadu SMKN 1 Tegalsari
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono">Memuat otentikasi sistem...</p>
      </div>
    );
  }

  // FLOW A: User explicitly opened the Login menu
  if (!currentUser && showLoginView) {
    return (
      <LoginPage
        pendingApp={pendingAppToOpen}
        onCancel={() => {
          setShowLoginView(false);
          setPendingAppToOpen(null);
        }}
        onSuccess={() => {
          setShowLoginView(false);
        }}
      />
    );
  }

  // FLOW B: Public Showcase (Tampilan Pertama / Katalog Utama)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f0f4f2] text-slate-900 flex flex-col select-none">
        {/* Public Header */}
        <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <OfficialLogo size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm sm:text-base tracking-tight text-slate-900">
                    PORTAL TERPADU APLIKASI
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {SCHOOL_INFO.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Pusat Layanan Aplikasi & Sistem Informasi Internal Sekolah
                </p>
              </div>
            </div>

            {/* Right: Live Clock & LOGIN Button */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-700">{publicDate}</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-emerald-700">{publicTime}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPendingAppToOpen(null);
                  setShowLoginView(true);
                }}
                className="py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all cursor-pointer tracking-wide"
              >
                <LogIn className="w-4 h-4" />
                <span>MASUK / LOGIN</span>
              </button>
            </div>
          </div>
        </header>

        {/* Public Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Welcome Announcement */}
          {settings.announcementText && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs flex items-start gap-3 text-xs animate-fadeIn">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                <BellRing className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-extrabold text-emerald-950 uppercase tracking-wider text-[11px]">
                    Pengumuman Resmi Sekolah
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">
                    {SCHOOL_INFO.fullName}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{settings.announcementText}</p>
              </div>
            </div>
          )}

          {/* Hero Banner Showcase */}
          <div className="relative rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 text-white p-6 sm:p-8 shadow-lg overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-[11px] font-bold text-emerald-200 mb-3 shadow-xs">
                <School className="w-3.5 h-3.5 text-amber-400" />
                <span>{SCHOOL_INFO.fullName}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                Aplikasi dan Layanan Sekolah
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 leading-relaxed">
                Seluruh aplikasi SMKN 1 Tegalsari terintegrasi di sini. Aplikasi bertanda <strong>Akses Umum</strong> dapat langsung dibuka tanpa login, sedangkan aplikasi internal sekolah memerlukan akun resmi.
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="mt-6 relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari aplikasi internal (misal: CBT Ujian, SISARPRAS, e-SISKA, Presensi, Kepegawaian)..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategoryId('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                activeCategoryId === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                  : 'bg-white text-slate-700 hover:text-emerald-800 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Semua Aplikasi ({userFilteredApps.length})
            </button>

            {categories.map((cat) => {
              const count = userFilteredApps.filter((a) => a.categoryId === cat.id).length;
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                      : 'bg-white text-slate-700 hover:text-emerald-800 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Applications Grid */}
          {displayedApps.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Tidak ada aplikasi yang sesuai pencarian</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tidak ada aplikasi yang cocok dengan kata kunci "{searchTerm}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategoryId('all');
                }}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Tampilkan Semua Aplikasi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedApps.map((app) => {
                const cat = categories.find((c) => c.id === app.categoryId);
                return (
                  <AppCard
                    key={app.id}
                    app={app}
                    category={cat}
                    currentUser={null}
                    onOpenApp={handleOpenApp}
                    isFavorite={favoriteIds.includes(app.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>
          )}

          {/* Security & Access Information Footer in Showcase */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">Akses Aman Terenkripsi</span>
                <span className="text-[11px] text-slate-500">
                  Seluruh pengguna wajib melakukan login menggunakan akun resmi sebelum membuka tautan aplikasi tujuan.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPendingAppToOpen(null);
                setShowLoginView(true);
              }}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0 cursor-pointer border border-slate-200 shadow-xs"
            >
              Masuk Sekarang
            </button>
          </div>
        </main>

        {/* Public Footer */}
        <footer className="w-full px-6 py-4 border-t border-slate-200 bg-white/90 text-center text-xs text-slate-500 mt-12">
          <p>
            &copy; {new Date().getFullYear()} {SCHOOL_INFO.fullName}. Hak Cipta Dilindungi.
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {SCHOOL_INFO.address} | NPSN: {SCHOOL_INFO.npsn}
          </p>
        </footer>

        {/* Public App Launch Modal (for UMUM / Tanpa Login apps) */}
        <AppLaunchModal
          app={selectedAppToOpen}
          isOpen={isLaunchModalOpen}
          onClose={() => setIsLaunchModalOpen(false)}
          currentUser={null}
          token={null}
          onAppOpened={loadPortalData}
        />
      </div>
    );
  }

  // FLOW C: Logged In Dashboard
  return (
    <div className="min-h-screen bg-[#f0f4f2] text-slate-900 flex flex-col">
      {/* Authenticated Header */}
      <Header
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          appsCount={userFilteredApps.length}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* Announcement Banner */}
          {settings.announcementText && currentTab === 'catalog' && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs flex items-start gap-3 text-xs animate-fadeIn">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                <BellRing className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-extrabold text-emerald-950 uppercase tracking-wider text-[11px]">
                    Pengumuman Resmi Sekolah
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">
                    {SCHOOL_INFO.fullName}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{settings.announcementText}</p>
              </div>
            </div>
          )}

          {/* TAB: CATALOG / DIREKTORI APLIKASI */}
          {currentTab === 'catalog' && (
            <div className="space-y-6">
              {/* Hero Banner with User Greeting */}
              <div className="relative rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 text-white p-6 sm:p-8 shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-[11px] font-bold text-emerald-200 mb-3 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Selamat Datang, {currentUser.fullName}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    Pusat Akses Aplikasi Internal
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 leading-relaxed">
                    Akses seluruh layanan akademik, ujian online, administrasi guru, sarpras, dan kesiswaan SMKN 1 Tegalsari dalam satu portal terverifikasi.
                  </p>
                </div>

                {/* Instant Search Bar */}
                <div className="mt-6 relative max-w-xl">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ketik nama aplikasi (misal: Ujian, SISARPRAS, e-SISKA, Presensi)..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-md"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                    activeCategoryId === 'all'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                      : 'bg-white text-slate-700 hover:text-emerald-800 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  Semua Aplikasi ({userFilteredApps.length})
                </button>

                {categories.map((cat) => {
                  const count = userFilteredApps.filter((a) => a.categoryId === cat.id).length;
                  const isActive = activeCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                          : 'bg-white text-slate-700 hover:text-emerald-800 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Applications Grid */}
              {displayedApps.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Tidak ada aplikasi yang ditemukan</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Aplikasi yang Anda cari dengan kata kunci "{searchTerm}" tidak tersedia atau belum diizinkan untuk peran akun Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setActiveCategoryId('all');
                    }}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tampilkan Semua Aplikasi
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedApps.map((app) => {
                    const cat = categories.find((c) => c.id === app.categoryId);
                    return (
                      <AppCard
                        key={app.id}
                        app={app}
                        category={cat}
                        currentUser={currentUser}
                        onOpenApp={handleOpenApp}
                        isFavorite={favoriteIds.includes(app.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: FAVORITES */}
          {currentTab === 'favorites' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 flex items-center gap-3 shadow-xs">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Aplikasi Favorit Anda</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar pintasan aplikasi yang sering Anda gunakan untuk tugas harian.
                  </p>
                </div>
              </div>

              {favoriteApps.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 shadow-xs">
                  <Star className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">Belum ada aplikasi favorit tersimpan</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Klik tanda bintang pada kartu aplikasi di menu Direktori untuk menambahkannya ke daftar favorit ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('catalog')}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Buka Direktori Aplikasi
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {favoriteApps.map((app) => {
                    const cat = categories.find((c) => c.id === app.categoryId);
                    return (
                      <AppCard
                        key={app.id}
                        app={app}
                        category={cat}
                        currentUser={currentUser}
                        onOpenApp={handleOpenApp}
                        isFavorite={true}
                        onToggleFavorite={toggleFavorite}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: GUIDE & HELP */}
          {currentTab === 'guide' && <GuideView />}

          {/* ADMIN TABS (Protected: Only ADMIN or SUPER_ADMIN) */}
          {(isAdmin || isSuperAdmin) && (
            <>
              {currentTab === 'admin-stats' && (
                <AdminDashboard
                  onNavigate={setCurrentTab}
                  applications={applications}
                  categories={categories}
                />
              )}

              {currentTab === 'admin-apps' && (
                <ApplicationManager
                  applications={applications}
                  categories={categories}
                  onRefresh={loadPortalData}
                  onUpdateApplications={(updated) => {
                    setApplications(updated);
                    saveLocalApplications(updated);
                  }}
                />
              )}

              {currentTab === 'admin-users' && (
                <UserManager applications={applications} />
              )}

              {currentTab === 'admin-categories' && (
                <CategoryManager
                  categories={categories}
                  applications={applications}
                  onRefresh={loadPortalData}
                  onUpdateCategories={(updated) => {
                    setCategories(updated);
                    saveLocalCategories(updated);
                  }}
                />
              )}

              {currentTab === 'admin-access' && (
                <AccessMatrix
                  applications={applications}
                  onRefresh={loadPortalData}
                />
              )}

              {currentTab === 'admin-logs' && <AuditLogs />}

              {currentTab === 'admin-settings' && isSuperAdmin && (
                <PortalSettingsView />
              )}
            </>
          )}
        </main>
      </div>

      {/* App Launch Verification Modal */}
      <AppLaunchModal
        app={selectedAppToOpen}
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        currentUser={currentUser}
        token={token}
        onAppOpened={loadPortalData}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PortalAppContent />
    </AuthProvider>
  );
}
