import React from 'react';
import {
  LayoutGrid,
  Star,
  HelpCircle,
  BarChart3,
  AppWindow,
  Users,
  FolderTree,
  ShieldCheck,
  History,
  Settings,
  Sparkles,
  School,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_INFO } from '../lib/schoolData';

export type NavigationTab =
  | 'catalog'
  | 'favorites'
  | 'guide'
  | 'admin-stats'
  | 'admin-apps'
  | 'admin-users'
  | 'admin-categories'
  | 'admin-access'
  | 'admin-logs'
  | 'admin-settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  appsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  appsCount = 10,
}) => {
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();

  const handleTabClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
      active
        ? 'bg-emerald-600 text-white shadow-sm font-bold'
        : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/80'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[61px] left-0 z-40 h-full lg:h-[calc(100vh-61px)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xs ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation Content with Custom Scrollbar */}
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Main User Navigation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Menu Utama Portal
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => handleTabClick('catalog')}
                className={`w-full ${navItemClass(currentTab === 'catalog')}`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Direktori Aplikasi</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                  {appsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('favorites')}
                className={`w-full ${navItemClass(currentTab === 'favorites')}`}
              >
                <Star className="w-4 h-4 shrink-0 text-amber-500" />
                <span className="flex-1 text-left">Aplikasi Tersimpan</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('guide')}
                className={`w-full ${navItemClass(currentTab === 'guide')}`}
              >
                <HelpCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="flex-1 text-left">Panduan & Bantuan</span>
              </button>
            </nav>
          </div>

          {/* Administrator Navigation - Protected */}
          {(isAdmin || isSuperAdmin) && (
            <div className="pt-2 border-t border-slate-100">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Panel Administrator
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  {isSuperAdmin ? 'SUPER' : 'ADMIN'}
                </span>
              </div>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleTabClick('admin-stats')}
                  className={`w-full ${navItemClass(currentTab === 'admin-stats')}`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="flex-1 text-left">Ringkasan Statistik</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('admin-apps')}
                  className={`w-full ${navItemClass(currentTab === 'admin-apps')}`}
                >
                  <AppWindow className="w-4 h-4 shrink-0 text-teal-600" />
                  <span className="flex-1 text-left">Kelola Aplikasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('admin-users')}
                  className={`w-full ${navItemClass(currentTab === 'admin-users')}`}
                >
                  <Users className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="flex-1 text-left">Kelola Pengguna</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('admin-categories')}
                  className={`w-full ${navItemClass(currentTab === 'admin-categories')}`}
                >
                  <FolderTree className="w-4 h-4 shrink-0 text-blue-600" />
                  <span className="flex-1 text-left">Kategori Aplikasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('admin-access')}
                  className={`w-full ${navItemClass(currentTab === 'admin-access')}`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="flex-1 text-left">Matriks Hak Akses</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('admin-logs')}
                  className={`w-full ${navItemClass(currentTab === 'admin-logs')}`}
                >
                  <History className="w-4 h-4 shrink-0 text-purple-600" />
                  <span className="flex-1 text-left">Riwayat Aktivitas & Log</span>
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleTabClick('admin-settings')}
                    className={`w-full ${navItemClass(currentTab === 'admin-settings')}`}
                  >
                    <Settings className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="flex-1 text-left">Pengaturan Portal</span>
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>

        {/* School Footer Badge in Sidebar */}
        <div className="p-3.5 m-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <School className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-900 text-[11px] truncate">{SCHOOL_INFO.name}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            {SCHOOL_INFO.motto}
          </p>
        </div>
      </aside>
    </>
  );
};
