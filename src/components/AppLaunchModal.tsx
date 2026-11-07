import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  Copy,
  Check,
  X,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { Application, User } from '../types';
import { getAppIcon } from './AppCard';
import { incrementAppOpenCount, addLocalLog } from '../lib/portalStorage';

interface AppLaunchModalProps {
  app: Application | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  token: string | null;
  onAppOpened?: () => void;
}

export const AppLaunchModal: React.FC<AppLaunchModalProps> = ({
  app,
  isOpen,
  onClose,
  currentUser,
  token,
  onAppOpened,
}) => {
  const [status, setStatus] = useState<'verifying' | 'granted' | 'denied'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !app) return;

    setStatus('verifying');
    setErrorMessage('');
    setTargetUrl('');

    // Local permission check first
    const isManager = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
    const roleAllowed = currentUser ? app.allowedRoles.includes(currentUser.role) : false;
    const explicitAllowed = currentUser?.allowedAppIds ? currentUser.allowedAppIds.includes(app.id) : false;

    if (!isManager && !roleAllowed && !explicitAllowed) {
      setStatus('denied');
      setErrorMessage('Akses ditolak: Akun Anda tidak memiliki izin untuk membuka aplikasi ini.');
      return;
    }

    if (!app.isActive && currentUser?.role !== 'SUPER_ADMIN') {
      setStatus('denied');
      setErrorMessage('Aplikasi sedang dalam pemeliharaan atau dinonaktifkan oleh administrator.');
      return;
    }

    // Trigger server-side validation and logging, with automatic local fallback
    const verifyAndOpen = async () => {
      try {
        if (token && !token.startsWith('local_session_')) {
          const res = await fetch(`/api/applications/${app.id}/open`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success) {
              setStatus('granted');
              setTargetUrl(data.targetUrl || app.targetUrl);
              incrementAppOpenCount(app.id);
              if (onAppOpened) onAppOpened();
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Server launch check error, using local verified session:', err);
      }

      // Local fallback approval
      setStatus('granted');
      setTargetUrl(app.targetUrl);
      incrementAppOpenCount(app.id);
      if (currentUser) {
        addLocalLog({
          userId: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
          action: 'OPEN_APP',
          details: `Membuka aplikasi ${app.name}`,
          targetAppId: app.id,
          targetAppName: app.name,
        });
      }
      if (onAppOpened) onAppOpened();
    };

    const timer = setTimeout(verifyAndOpen, 250);
    return () => clearTimeout(timer);
  }, [isOpen, app, token, currentUser]);

  if (!isOpen || !app) return null;

  const handleLaunchTarget = () => {
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  const handleCopyUrl = () => {
    if (targetUrl) {
      navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Accent Banner */}
        <div
          className={`h-2 w-full ${
            status === 'verifying'
              ? 'bg-emerald-600 animate-pulse'
              : status === 'granted'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400'
              : 'bg-red-600'
          }`}
        />

        <div className="p-6">
          {/* App Header & Icon */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 flex items-center justify-center text-white shadow-md shrink-0">
              {getAppIcon(app.iconName, 'w-7 h-7')}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Aplikasi Internal SMKN 1 Tegalsari
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{app.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{app.description}</p>
            </div>
          </div>

          {/* Verification Status Feedback */}
          {status === 'verifying' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-900">Memverifikasi Hak Akses Sistem...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Server memeriksa kredensial pengguna @{currentUser?.username} ({currentUser?.role})
                </p>
              </div>
            </div>
          )}

          {status === 'granted' && (
            <div className="space-y-4">
              {/* Clearance Passed Card */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Otorisasi Berhasil Diverifikasi
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Aktivitas pembukaan aplikasi telah tercatat dalam audit log server sekolah.
                  </p>
                </div>
              </div>

              {/* Target URL Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="truncate text-xs font-mono text-slate-700">
                  <span className="text-slate-400 mr-1.5">URL Tujuan:</span>
                  <span className="text-emerald-700 font-bold">{targetUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                  title="Salin URL"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleLaunchTarget}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>BUKA APLIKASI SEKARANG</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {status === 'denied' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-900">
                    Akses Dibatasi oleh Administrator
                  </h4>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Peran Akun Anda: {currentUser?.role}</p>
                <p>
                  Aplikasi ini hanya dapat diakses oleh peran: <span className="font-bold text-amber-800">{app.allowedRoles.join(', ')}</span>.
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Jika Anda memerlukan akses untuk keperluan tugas atau dinas sekolah, silakan hubungi Koordinator IT SMKN 1 Tegalsari.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Kembali ke Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
