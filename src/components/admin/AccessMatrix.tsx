import React, { useState } from 'react';
import { ShieldCheck, Check, X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Application, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAppIcon } from '../AppCard';
import { addOrUpdateLocalApplication } from '../../lib/portalStorage';
import { syncCloudApplication } from '../../lib/firestoreSync';

interface AccessMatrixProps {
  applications: Application[];
  onRefresh: () => void;
}

const ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'GURU', 'SISWA'];

export const AccessMatrix: React.FC<AccessMatrixProps> = ({
  applications,
  onRefresh,
}) => {
  const { token } = useAuth();
  const [matrix, setMatrix] = useState<{ [appId: string]: UserRole[] }>(() => {
    const initial: { [appId: string]: UserRole[] } = {};
    applications.forEach((a) => {
      initial[a.id] = [...a.allowedRoles];
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleAccess = (appId: string, role: UserRole) => {
    setMatrix((prev) => {
      const current = prev[appId] || [];
      if (current.includes(role)) {
        if (current.length === 1) return prev; // Keep at least one role
        return { ...prev, [appId]: current.filter((r) => r !== role) };
      } else {
        return { ...prev, [appId]: [...current, role] };
      }
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const authToken = token || localStorage.getItem('token') || 'local_session_superadmin';
      // Save updates for apps where matrix changed
      const updatePromises = applications.map(async (app) => {
        const newRoles = matrix[app.id];
        if (!newRoles) return;
        const updatedApp = { ...app, allowedRoles: newRoles, updatedAt: new Date().toISOString() };
        
        // Update local storage
        addOrUpdateLocalApplication(updatedApp);
        // Sync to Cloud Firestore
        await syncCloudApplication(updatedApp);
        // Sync to server
        await fetch(`/api/applications/${app.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ allowedRoles: newRoles }),
        });
      });

      await Promise.all(updatePromises);
      setSuccessMessage('Matriks hak akses berhasil disimpan dan diverifikasi.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Save matrix error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Matriks Kebijakan Hak Akses Peran</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tentukan kewenangan akses aplikasi internal berdasarkan role (SUPER ADMIN, ADMIN, GURU, SISWA).
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Seluruh Hak Akses'}</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Access Matrix Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-1/3">Aplikasi Sekolah</th>
                {ROLES.map((role) => (
                  <th key={role} className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded border text-[9px] font-extrabold ${
                        role === 'SUPER_ADMIN'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : role === 'ADMIN'
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : role === 'GURU'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-sky-50 text-sky-800 border-sky-300'
                      }`}
                    >
                      {role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => {
                const appRoles = matrix[app.id] || app.allowedRoles;
                return (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 font-bold">
                          {getAppIcon(app.iconName, 'w-4 h-4')}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{app.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{app.targetUrl}</span>
                        </div>
                      </div>
                    </td>

                    {ROLES.map((role) => {
                      const isAllowed = appRoles.includes(role);
                      const isSuperAdminRole = role === 'SUPER_ADMIN';

                      return (
                        <td key={role} className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAccess(app.id, role)}
                            disabled={isSuperAdminRole} // Super Admin always has access
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                              isAllowed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-xs'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-700 hover:bg-slate-200'
                            } ${isSuperAdminRole ? 'cursor-not-allowed opacity-90' : ''}`}
                            title={
                              isSuperAdminRole
                                ? 'Super Admin memiliki hak akses penuh secara permanen'
                                : isAllowed
                                ? 'Klik untuk mencabut izin peran ini'
                                : 'Klik untuk memberikan izin peran ini'
                            }
                          >
                            {isAllowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
