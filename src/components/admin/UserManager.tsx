import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Power,
  Edit,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Save,
  X,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { User, UserRole, Application } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getLocalUsers,
  getSafeUser,
  addOrUpdateClientUser,
  deleteClientUser,
  toggleClientUserStatus,
  resetClientUserPassword,
} from '../../lib/clientAuth';
import {
  fetchCloudUsers,
  syncCloudUser,
  deleteCloudUser,
} from '../../lib/firestoreSync';

interface UserManagerProps {
  applications: Application[];
}

export const UserManager: React.FC<UserManagerProps> = ({ applications }) => {
  const { token, currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('GURU');
  const [formDepartment, setFormDepartment] = useState('');
  const [formAllowedAppIds, setFormAllowedAppIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    // 1. Try Cloud Firestore first
    try {
      const cloudUsers = await fetchCloudUsers();
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Fetch cloud users failed:', e);
    }

    // 2. Try server backend
    try {
      if (token && !token.startsWith('local_session_')) {
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.users && data.users.length > 0) {
            setUsers(data.users);
            setIsLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Fetch users from server failed, using local storage:', err);
    }

    // 3. Local fallback
    const local = getLocalUsers().map(getSafeUser);
    setUsers(local);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormEmail('');
    setFormFullName('');
    setFormRole('GURU');
    setFormDepartment('Guru / Tenaga Pendidik');
    setFormAllowedAppIds([]);
    setFormIsActive(true);
    setFeedbackMessage(null);
    setIsUserModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormPassword('');
    setFormEmail(u.email);
    setFormFullName(u.fullName);
    setFormRole((u.role as any) === 'USER' ? 'GURU' : u.role);
    setFormDepartment(u.department || '');
    setFormAllowedAppIds(u.allowedAppIds || []);
    setFormIsActive(u.isActive);
    setFeedbackMessage(null);
    setIsUserModalOpen(true);
  };

  const openResetModal = (u: User) => {
    setTargetResetUser(u);
    setNewPassword('');
    setFeedbackMessage(null);
    setIsResetModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    if (!formUsername.trim() || !formFullName.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Username dan Nama Lengkap wajib diisi.' });
      return;
    }
    if (!editingUser && (!formPassword || formPassword.length < 5)) {
      setFeedbackMessage({ type: 'error', text: 'Password minimal 5 karakter untuk akun baru.' });
      return;
    }

    setIsSubmitting(true);
    const payload: any = {
      id: editingUser ? editingUser.id : undefined,
      username: formUsername.trim().toLowerCase(),
      fullName: formFullName.trim(),
      email: formEmail.trim().toLowerCase() || `${formUsername.trim()}@smkn1tegalsari.sch.id`,
      role: formRole,
      department: formDepartment.trim(),
      allowedAppIds: formAllowedAppIds.length > 0 ? formAllowedAppIds : undefined,
      isActive: formIsActive,
      password: !editingUser ? formPassword : (formPassword ? formPassword : undefined),
    };

    try {
      if (token && !token.startsWith('local_session_')) {
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        const method = editingUser ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const saved = await addOrUpdateClientUser(payload);
          syncCloudUser(saved);
          setIsUserModalOpen(false);
          fetchUsers();
          return;
        }
      }

      // Local fallback & Cloud Firestore sync
      const saved = await addOrUpdateClientUser(payload);
      syncCloudUser(saved);
      setIsUserModalOpen(false);
      fetchUsers();
      setFeedbackMessage({ type: 'success', text: `Akun @${payload.username} berhasil disimpan.` });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.warn('Save user server error, saving locally & to cloud:', err);
      const saved = await addOrUpdateClientUser(payload);
      syncCloudUser(saved);
      setIsUserModalOpen(false);
      fetchUsers();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetUser || !newPassword || newPassword.length < 5) {
      setFeedbackMessage({ type: 'error', text: 'Password baru minimal 5 karakter' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (token && !token.startsWith('local_session_')) {
        await fetch(`/api/users/${targetResetUser.id}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword }),
        }).catch(() => {});
      }

      await resetClientUserPassword(targetResetUser.id, newPassword);
      setIsResetModalOpen(false);
      setFeedbackMessage({ type: 'success', text: `Sandi untuk @${targetResetUser.username} berhasil diubah.` });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      if (token && !token.startsWith('local_session_')) {
        await fetch(`/api/users/${userId}/toggle-active`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      const toggled = toggleClientUserStatus(userId);
      if (toggled) syncCloudUser(toggled);
      fetchUsers();
    } catch (err) {
      console.error('Toggle active error:', err);
      const toggled = toggleClientUserStatus(userId);
      if (toggled) syncCloudUser(toggled);
      fetchUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      if (token && !token.startsWith('local_session_')) {
        await fetch(`/api/users/${deleteConfirmUser.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      const deletedId = deleteConfirmUser.id;
      setUsers((prev) => prev.filter((u) => u.id !== deletedId));
      deleteClientUser(deletedId);
      await deleteCloudUser(deletedId);
      setFeedbackMessage({ type: 'success', text: `Akun @${deleteConfirmUser.username} (${deleteConfirmUser.fullName}) berhasil dihapus.` });
      setDeleteConfirmUser(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      console.error('Delete user error:', err);
      const deletedId = deleteConfirmUser.id;
      setUsers((prev) => prev.filter((u) => u.id !== deletedId));
      deleteClientUser(deletedId);
      await deleteCloudUser(deletedId);
      setFeedbackMessage({ type: 'success', text: `Akun @${deleteConfirmUser.username} berhasil dihapus.` });
      setDeleteConfirmUser(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Manajemen Akun & Hak Akses Pengguna</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pengguna portal terpadu, atur perizinan peran, reset kata sandi, dan status aktif.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, username, atau email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
        >
          <option value="all">Semua Peran (Roles)</option>
          <option value="SUPER_ADMIN">SUPER ADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="GURU">GURU (Tenaga Pendidik)</option>
          <option value="SISWA">SISWA (Peserta Didik)</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nama & Username</th>
                <th className="py-3.5 px-4">Role Peran</th>
                <th className="py-3.5 px-4">Unit / Departemen</th>
                <th className="py-3.5 px-4">Login Terakhir</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Kelola Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada akun pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">@{u.username} • {u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            u.role === 'SUPER_ADMIN'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : u.role === 'ADMIN'
                              ? 'bg-teal-50 text-teal-800 border-teal-300'
                              : u.role === 'SISWA'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {u.department || 'Umum'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Belum pernah login'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u.id)}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-80'
                              : u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title={isCurrent ? 'Tidak bisa menonaktifkan akun sendiri' : 'Klik ubah status aktif/nonaktif'}
                        >
                          <Power className="w-3 h-3" />
                          <span>{u.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openResetModal(u)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 transition-colors cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors cursor-pointer"
                            title="Edit Data Pengguna"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600'
                            }`}
                            title={isCurrent ? 'Tidak bisa menghapus akun Anda sendiri' : 'Hapus Akun Pengguna'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900 mb-1">
              Hapus Akun Pengguna?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-900">@{deleteConfirmUser.username}</span> ({deleteConfirmUser.fullName})?
              Tindakan ini bersifat permanen dan pengguna tidak dapat masuk ke portal lagi.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && targetResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900 mb-1">
              Reset Password Pengguna
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Atur ulang password untuk akun <span className="font-bold text-slate-900">@{targetResetUser.username}</span> ({targetResetUser.fullName}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 5 karakter"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {isSubmitting ? 'Memproses...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Username *</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: guru.siti"
                    required
                    disabled={!!editingUser}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="siti@smkn1tegalsari.sch.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Password Akun Baru *</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Minimal 5 karakter"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Contoh: Dra. Hj. Siti Aminah, M.Pd."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Peran (Role) *</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setFormRole(newRole);
                      if (!editingUser) {
                        if (newRole === 'SISWA') {
                          setFormDepartment('Siswa / Peserta Didik');
                        } else if (newRole === 'GURU') {
                          setFormDepartment('Guru / Tenaga Pendidik');
                        } else if (newRole === 'ADMIN') {
                          setFormDepartment('Administrator Portal');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    <option value="GURU">GURU (Tenaga Pendidik)</option>
                    <option value="SISWA">SISWA (Peserta Didik)</option>
                    <option value="ADMIN">ADMIN (Pengelola Aplikasi)</option>
                    {isSuperAdmin && <option value="SUPER_ADMIN">SUPER ADMIN (Semua Fitur)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Departemen / Unit</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="Contoh: Kurikulum / Tata Usaha"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Specific allowed applications overrides (optional) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Izin Khusus Aplikasi Tertentu (Opsional)
                </label>
                <p className="text-[10px] text-slate-500 mb-2">
                  Secara default, pengguna mendapatkan akses berdasarkan Role mereka. Anda dapat mencentang aplikasi khusus di bawah ini:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {applications.map((app) => {
                    const isChecked = formAllowedAppIds.includes(app.id);
                    return (
                      <label
                        key={app.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-slate-800 text-xs font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormAllowedAppIds([...formAllowedAppIds, app.id]);
                            } else {
                              setFormAllowedAppIds(formAllowedAppIds.filter((id) => id !== app.id));
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-0"
                        />
                        <span className="truncate">{app.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Status Akun Aktif</span>
                  <span className="text-[10px] text-slate-500">
                    Bila nonaktif, pengguna tidak dapat masuk ke portal sekolah
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    formIsActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {formIsActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
