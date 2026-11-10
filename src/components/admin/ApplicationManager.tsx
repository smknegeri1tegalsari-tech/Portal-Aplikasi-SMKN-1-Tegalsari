import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  ExternalLink,
  Search,
  Check,
  X,
  AlertCircle,
  GraduationCap,
  Building2,
  Laptop,
  Briefcase,
  Users,
  FolderCheck,
  BookOpen,
  FileText,
  Clock,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { Application, Category, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAppIcon } from '../AppCard';
import {
  addOrUpdateLocalApplication,
  deleteLocalApplication,
  toggleLocalApplicationStatus,
} from '../../lib/portalStorage';
import {
  syncCloudApplication,
  deleteCloudApplication,
} from '../../lib/firestoreSync';

interface ApplicationManagerProps {
  applications: Application[];
  categories: Category[];
  onRefresh: () => void;
  onUpdateApplications?: (apps: Application[]) => void;
}

const AVAILABLE_ICONS = [
  'GraduationCap',
  'Building2',
  'Laptop',
  'Briefcase',
  'Users',
  'FolderCheck',
  'BookOpen',
  'FileText',
  'Clock',
  'ShieldCheck',
  'ExternalLink',
];

export const ApplicationManager: React.FC<ApplicationManagerProps> = ({
  applications,
  categories,
  onRefresh,
  onUpdateApplications,
}) => {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formTargetUrl, setFormTargetUrl] = useState('');
  const [formIconName, setFormIconName] = useState('ExternalLink');
  const [formBadge, setFormBadge] = useState('');
  const [formAllowedRoles, setFormAllowedRoles] = useState<UserRole[]>(['SUPER_ADMIN', 'ADMIN', 'USER']);
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    if (!formCategoryId && categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
  }, [categories, formCategoryId]);

  const openCreateModal = () => {
    setEditingApp(null);
    setFormName('');
    setFormDescription('');
    setFormCategoryId(categories.length > 0 ? categories[0].id : '');
    setFormTargetUrl('https://');
    setFormIconName('Laptop');
    setFormBadge('');
    setFormAllowedRoles(['SUPER_ADMIN', 'ADMIN', 'USER']);
    setFormIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setFormName(app.name);
    setFormDescription(app.description || '');
    setFormCategoryId(app.categoryId);
    setFormTargetUrl(app.targetUrl);
    setFormIconName(app.iconName || 'ExternalLink');
    setFormBadge(app.badge || '');
    setFormAllowedRoles(app.allowedRoles || ['SUPER_ADMIN', 'ADMIN', 'USER']);
    setFormIsActive(app.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleRole = (role: UserRole) => {
    if (formAllowedRoles.includes(role)) {
      if (formAllowedRoles.length === 1) {
        setError('Aplikasi minimal harus dapat diakses oleh satu peran');
        return;
      }
      setFormAllowedRoles(formAllowedRoles.filter((r) => r !== role));
    } else {
      setFormAllowedRoles([...formAllowedRoles, role]);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = formName.trim();
    const cleanUrl = formTargetUrl.trim();
    const targetCategoryId = formCategoryId || (categories.length > 0 ? categories[0].id : '');

    if (!cleanName) {
      setError('Nama aplikasi wajib diisi');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError('URL target harus diawali dengan http:// atau https://');
      return;
    }
    if (!targetCategoryId) {
      setError('Pilih kategori untuk aplikasi');
      return;
    }

    setIsSubmitting(true);
    const appId = editingApp ? editingApp.id : `app-${Date.now()}`;
    const appPayload: Application = {
      id: appId,
      name: cleanName,
      description: formDescription.trim(),
      categoryId: targetCategoryId,
      targetUrl: cleanUrl,
      iconName: formIconName,
      allowedRoles: formAllowedRoles,
      isActive: formIsActive,
      sortOrder: editingApp ? editingApp.sortOrder : applications.length + 1,
      openCount: editingApp ? editingApp.openCount : 0,
      createdAt: editingApp ? editingApp.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (formBadge.trim()) {
      appPayload.badge = formBadge.trim();
    }

    // 1. Immediately update parent state so UI updates with 0ms latency
    const updatedList = editingApp
      ? applications.map((a) => (a.id === editingApp.id ? { ...a, ...appPayload } : a))
      : [...applications, appPayload];

    if (onUpdateApplications) {
      onUpdateApplications(updatedList);
    }

    // 2. Immediately persist to local storage
    addOrUpdateLocalApplication(appPayload);

    // 3. Await direct synchronization to Cloud Firestore
    try {
      await syncCloudApplication(appPayload);
    } catch (err) {
      console.error('[Firestore] App sync error:', err);
    }

    // 4. Await backend server sync
    try {
      const url = editingApp ? `/api/applications/${editingApp.id}` : '/api/applications';
      const method = editingApp ? 'PUT' : 'POST';
      const authToken = token || localStorage.getItem('token') || 'local_session_superadmin';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(appPayload),
      });
    } catch (err) {
      console.warn('[Server] App sync warning:', err);
    }

    // 5. Trigger catalog reload from primary database
    if (onRefresh) {
      onRefresh();
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setEditingApp(null);
  };

  const handleToggleActive = async (appId: string) => {
    const target = applications.find((a) => a.id === appId);
    if (!target) return;

    const updatedApp: Application = {
      ...target,
      isActive: !target.isActive,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update state immediately
    const updatedList = applications.map((a) => (a.id === appId ? updatedApp : a));
    if (onUpdateApplications) {
      onUpdateApplications(updatedList);
    }

    // 2. Toggle in local storage
    toggleLocalApplicationStatus(appId);

    // 3. Sync to Cloud Firestore
    try {
      await syncCloudApplication(updatedApp);
    } catch (err) {
      console.warn('[Firestore] Toggle sync warning:', err);
    }

    // 4. Sync to server
    try {
      const authToken = token || localStorage.getItem('token') || 'local_session_superadmin';
      await fetch(`/api/applications/${appId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      console.warn('[Server] Toggle sync warning:', err);
    }
  };

  const handleDelete = async (appId: string) => {
    // 1. Immediately remove from React state so it vanishes from UI on the spot
    const updatedList = applications.filter((a) => a.id !== appId);
    if (onUpdateApplications) {
      onUpdateApplications(updatedList);
    }

    // 2. Delete from local storage
    deleteLocalApplication(appId);
    setDeleteConfirmId(null);

    // 3. Await deletion in Cloud Firestore
    try {
      await deleteCloudApplication(appId);
    } catch (err) {
      console.warn('[Firestore] Delete warning:', err);
    }

    // 4. Await deletion on backend server
    try {
      const authToken = token || localStorage.getItem('token') || 'local_session_superadmin';
      await fetch(`/api/applications/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      console.warn('[Server] Delete warning:', err);
    }
  };

  // Filtered applications
  const filtered = applications.filter((app) => {
    const matchSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.targetUrl.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || app.categoryId === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Manajemen Direktori Aplikasi</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tambah, edit tautan target, ubah hak akses peran, atau aktifkan mode pemeliharaan aplikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Aplikasi Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama aplikasi atau link..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Aplikasi & Ikon</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Target URL</th>
                <th className="py-3.5 px-4">Akses Peran</th>
                <th className="py-3.5 px-4 text-center">Dibuka</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada aplikasi yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const cat = categories.find((c) => c.id === app.categoryId);
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 font-bold">
                            {getAppIcon(app.iconName, 'w-4 h-4')}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{app.name}</span>
                            {app.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                {app.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {cat?.name || app.categoryId}
                      </td>

                      {/* Target URL */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-emerald-700 max-w-[180px] truncate">
                        <a
                          href={app.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 font-medium"
                        >
                          <span className="truncate">{app.targetUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {app.allowedRoles.map((r) => (
                            <span
                              key={r}
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                r === 'SUPER_ADMIN'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : r === 'ADMIN'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Opens */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-700 font-bold">
                        {app.openCount || 0}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(app.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            app.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Klik untuk beralih status aktif/nonaktif"
                        >
                          <Power className="w-3 h-3" />
                          <span>{app.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(app)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors"
                            title="Edit Aplikasi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(app.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 transition-colors"
                            title="Hapus Aplikasi"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Hapus Aplikasi?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Aplikasi ini akan dihapus dari direktori portal sekolah. Tindakan ini tercatat dalam audit log.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingApp ? 'Edit Data Aplikasi' : 'Tambah Aplikasi Internal Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Aplikasi *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Aplikasi Ujian SEMAKASARI"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target URL Aplikasi *</label>
                <input
                  type="url"
                  value={formTargetUrl}
                  onChange={(e) => setFormTargetUrl(e.target.value)}
                  placeholder="https://cbt.smkn1tegalsari.sch.id"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Kategori *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Label / Badge</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="Contoh: CBT Ujian / Utama"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Deskripsi Singkat</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Jelaskan fungsi utama aplikasi ini bagi civitas akademika..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Pilih Ikon Aplikasi</label>
                <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormIconName(icon)}
                      className={`p-2 rounded-lg transition-all cursor-pointer ${
                        formIconName === icon
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:text-emerald-700 hover:border-emerald-300'
                      }`}
                      title={icon}
                    >
                      {getAppIcon(icon, 'w-4 h-4')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed Roles Multi-Check */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Hak Akses Peran yang Diizinkan:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SUPER_ADMIN', 'ADMIN', 'USER'] as UserRole[]).map((role) => {
                    const isChecked = formAllowedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleToggleRole(role)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'
                        }`}
                      >
                        <span className="text-[11px]">{role}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block">Status Aplikasi</span>
                  <span className="text-[10px] text-slate-500">
                    Aktifkan agar dapat dibuka oleh pengguna portal
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

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Aplikasi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
