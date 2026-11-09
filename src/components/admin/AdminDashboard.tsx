import React, { useEffect, useState } from 'react';
import {
  Users,
  AppWindow,
  FolderTree,
  Eye,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Activity,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Application, Category, DashboardStats, AccessLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { NavigationTab } from '../Sidebar';

interface AdminDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  applications: Application[];
  categories: Category[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  applications,
  categories,
}) => {
  const { token, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [resStats, resLogs] = await Promise.all([
        fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/logs?limit=8', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data.stats);
      }
      if (resLogs.ok) {
        const data = await resLogs.json();
        setRecentLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  const handleResetDemoData = async () => {
    setShowResetModal(false);
    try {
      const res = await fetch('/api/seed/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResetMessage('Data awal berhasil dipulihkan.');
        fetchStats();
        setTimeout(() => setResetMessage(null), 3000);
      }
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  // Top 5 most opened applications
  const topApps = [...applications].sort((a, b) => (b.openCount || 0) - (a.openCount || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 border border-emerald-900/40 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-200 border border-emerald-400/30">
              Dashboard Administrator
            </span>
            <span className="text-xs text-emerald-200">SMKN 1 Tegalsari</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Ringkasan Statistik & Operasional Portal
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            Pantau status penggunaan aplikasi sekolah, log autentikasi pengguna, dan kendali sistem.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            title="Muat ulang statistik"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-300' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('admin-apps')}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-500"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Aplikasi</span>
          </button>
        </div>
      </div>

      {resetMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Apps Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Total Aplikasi</span>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <AppWindow className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalApps ?? applications.length}</div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {stats?.activeApps ?? applications.filter((a) => a.isActive).length} Aktif
            </span>
            <span className="text-slate-400">
              {(stats?.totalApps ?? applications.length) - (stats?.activeApps ?? applications.filter((a) => a.isActive).length)} Nonaktif
            </span>
          </div>
        </div>

        {/* Total Users Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Pengguna Terdaftar</span>
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalUsers ?? 4}</div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {stats?.activeUsers ?? 4} Akun Aktif
            </span>
            <button
              onClick={() => onNavigate('admin-users')}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              Kelola
            </button>
          </div>
        </div>

        {/* Total Launches Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Total Akses Aplikasi</span>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {stats?.totalLaunches ?? 2450}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Akumulasi peluncuran link sistem
          </div>
        </div>

        {/* Categories Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Kategori Layanan</span>
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalCategories ?? categories.length}</div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Pengelompokan resmi</span>
            <button
              onClick={() => onNavigate('admin-categories')}
              className="text-blue-700 hover:text-blue-800 font-bold hover:underline cursor-pointer"
            >
              Kelola
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Top Applications & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Popular Applications */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Aplikasi Paling Sering Digunakan
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admin-apps')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topApps.map((app, idx) => (
              <div
                key={app.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold font-mono text-slate-700">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{app.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[220px] block">
                      {app.targetUrl}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-amber-700">
                    {app.openCount || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">kali</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Recent Activity Audit Logs */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Aktivitas Pengguna Terkini
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admin-logs')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              Audit Log Lengkap <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Belum ada catatan aktivitas baru.</p>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        log.action === 'LOGIN'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : log.action === 'OPEN_APP'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : log.action === 'LOGOUT'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
                      {log.action}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900">@{log.username}</span>
                      <span className="text-slate-600 ml-1 text-[11px]">
                        {log.targetAppName ? `membuka ${log.targetAppName}` : log.details || ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Super Admin Disaster Recovery / Seed Reset Panel */}
      {isSuperAdmin && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Pemulihan Basis Data Contoh (Factory Reset Data)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Jika diperlukan, kembalikan 10 aplikasi awal, kategori default, dan akun demo ke konfigurasi mula-mula.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            Reset Data Contoh Awal
          </button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reset Data Contoh Awal?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Tindakan ini akan mengembalikan seluruh 10 aplikasi default, kategori, dan akun demo SMKN 1 Tegalsari ke kondisi awal.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Pulihkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
