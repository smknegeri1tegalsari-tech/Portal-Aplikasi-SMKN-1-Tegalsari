import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  LogIn,
  LogOut,
  AppWindow,
  UserCheck,
  KeyRound,
  Settings,
  Shield,
} from 'lucide-react';
import { AccessLog } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AuditLogs: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/logs?limit=300', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const handleExportCSV = () => {
    const headers = ['Waktu', 'Username', 'Peran', 'Aksi', 'Aplikasi Target', 'Rincian', 'IP Address', 'User Agent'];
    const rows = logs.map((l) => [
      l.timestamp,
      l.username,
      l.role,
      l.action,
      l.targetAppName || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.ipAddress || '',
      `"${(l.userAgent || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_smkn1_tegalsari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: AccessLog['action']) => {
    switch (action) {
      case 'LOGIN':
        return { label: 'LOGIN', color: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold' };
      case 'LOGOUT':
        return { label: 'LOGOUT', color: 'bg-slate-100 text-slate-700 border-slate-300 font-extrabold' };
      case 'OPEN_APP':
        return { label: 'BUKA APLIKASI', color: 'bg-teal-50 text-teal-800 border-teal-300 font-extrabold' };
      case 'CREATE_APP':
      case 'UPDATE_APP':
      case 'DELETE_APP':
        return { label: action, color: 'bg-blue-50 text-blue-800 border-blue-300 font-extrabold' };
      case 'CREATE_USER':
      case 'UPDATE_USER':
      case 'ACTIVATE_USER':
      case 'DEACTIVATE_USER':
        return { label: action, color: 'bg-purple-50 text-purple-800 border-purple-300 font-extrabold' };
      case 'RESET_PASSWORD':
        return { label: 'RESET PASSWORD', color: 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-700 border-slate-300 font-extrabold' };
    }
  };

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetAppName && log.targetAppName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ipAddress && log.ipAddress.includes(searchTerm));
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Riwayat Aktivitas & Audit Keamanan</h2>
          <p className="text-xs text-slate-500 mt-1">
            Rekam jejak akses login, peluncuran tautan aplikasi sekolah, dan modifikasi data oleh admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Segarkan log"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border border-emerald-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-700/20"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari user, aplikasi, atau IP..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
        >
          <option value="all">Semua Jenis Aksi</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="OPEN_APP">BUKA APLIKASI</option>
          <option value="CREATE_APP">TAMBAH APLIKASI</option>
          <option value="UPDATE_APP">UBAH APLIKASI</option>
          <option value="CREATE_USER">TAMBAH USER</option>
          <option value="RESET_PASSWORD">RESET PASSWORD</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Waktu (WIB)</th>
                <th className="py-3.5 px-4">Pengguna & Peran</th>
                <th className="py-3.5 px-4">Aksi</th>
                <th className="py-3.5 px-4">Aplikasi / Keterangan</th>
                <th className="py-3.5 px-4 text-right">IP & Perangkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada catatan aktivitas yang sesuai.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">@{log.username}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            {log.role}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {log.targetAppName ? (
                          <div className="font-semibold text-slate-900">
                            {log.targetAppName}
                            {log.details && <span className="block text-[10px] text-slate-500 font-normal">{log.details}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-600">{log.details || '-'}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[10px]">
                        <span className="text-emerald-700 font-bold block">{log.ipAddress || '127.0.0.1'}</span>
                        <span className="text-[9px] text-slate-500 truncate max-w-[160px] inline-block">
                          {log.userAgent || 'Web Client'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
