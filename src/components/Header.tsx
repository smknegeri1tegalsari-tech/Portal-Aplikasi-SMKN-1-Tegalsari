import React, { useState, useEffect } from 'react';
import {
  LogOut,
  User as UserIcon,
  Clock,
  Shield,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OfficialLogo } from './OfficialLogo';
import { SCHOOL_INFO } from '../lib/schoolData';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const { currentUser, logout, isSuperAdmin, isAdmin } = useAuth();
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Indonesian Date String
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      setDateString(now.toLocaleDateString('id-ID', options));
      setTimeString(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return {
        label: 'SUPER ADMIN',
        style: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
      };
    }
    if (isAdmin) {
      return {
        label: 'ADMINISTRATOR',
        style: 'bg-teal-50 text-teal-800 border-teal-300 font-bold',
      };
    }
    if (currentUser?.role === 'SISWA') {
      return {
        label: 'SISWA',
        style: 'bg-sky-50 text-sky-800 border-sky-300 font-bold',
      };
    }
    if (currentUser?.role === 'UMUM') {
      return {
        label: 'UMUM / PUBLIK',
        style: 'bg-purple-50 text-purple-800 border-purple-300 font-bold',
      };
    }
    return {
      label: 'GURU',
      style: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    };
  };

  const roleBadge = getRoleBadge();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-xs">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            aria-label="Toggle navigation"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <OfficialLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-900">
                  PORTAL TERPADU APLIKASI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  SMKN 1 TEGALSARI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Satu Gerbang Akses Aplikasi Internal Sekolah
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Real-Time Indonesian Clock */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 shadow-xs">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-700 font-sans">{dateString}</span>
          <span className="text-slate-300">•</span>
          <span className="font-bold text-emerald-700 tracking-wider">{timeString}</span>
        </div>

        {/* Right: User Information & Logout */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.fullName}
                </span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${roleBadge.style}`}>
                    {roleBadge.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    @{currentUser.username}
                  </span>
                </div>
              </div>

              {/* User Avatar Circle */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-white text-sm shadow-sm border border-emerald-500">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 text-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                title="Keluar dari sesi portal"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="hidden xl:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4 text-red-600">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">
              Konfirmasi Keluar Portal
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6 leading-relaxed">
              Apakah Anda yakin ingin keluar dari sesi Portal Terpadu SMKN 1 Tegalsari?
              Anda perlu memasukkan kembali kredensial untuk membuka aplikasi internal sekolah.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-colors cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
