import React, { useState } from 'react';
import { Plus, Edit2, Trash2, FolderTree, Save, X, AlertCircle } from 'lucide-react';
import { Category, Application } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  addOrUpdateLocalCategory,
  deleteLocalCategory,
} from '../../lib/portalStorage';
import {
  syncCloudCategory,
  deleteCloudCategory,
} from '../../lib/firestoreSync';

interface CategoryManagerProps {
  categories: Category[];
  applications: Application[];
  onRefresh: () => void;
  onUpdateCategories?: (cats: Category[]) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  applications,
  onRefresh,
  onUpdateCategories,
}) => {
  const { token } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kategori wajib diisi');
      return;
    }

    setIsSubmitting(true);
    const catId = editingCategory ? editingCategory.id : `cat-${Date.now()}`;
    const catPayload: Category = {
      id: catId,
      name: name.trim(),
      description: description.trim(),
      sortOrder: editingCategory ? editingCategory.sortOrder : categories.length + 1,
      createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString(),
    };

    // 1. Immediately update parent state for 0ms UI response
    const updatedList = editingCategory
      ? categories.map((c) => (c.id === editingCategory.id ? catPayload : c))
      : [...categories, catPayload];

    if (onUpdateCategories) {
      onUpdateCategories(updatedList);
    }

    // 2. Immediately persist locally
    addOrUpdateLocalCategory(catPayload);

    // 3. Await synchronize directly to Cloud Firestore
    try {
      await syncCloudCategory(catPayload);
    } catch (err) {
      console.warn('[Firestore] Category sync warning:', err);
    }

    // 4. Await sync to server
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const authToken = token || localStorage.getItem('token') || 'local_session_superadmin';

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(catPayload),
      });
    } catch (err) {
      console.warn('Server sync error:', err);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const confirmDelete = (cat: Category) => {
    setDeleteConfirmCat(cat);
  };

  const handleDelete = async () => {
    if (!deleteConfirmCat) return;
    const catId = deleteConfirmCat.id;

    // 1. Immediately remove from state
    const updatedList = categories.filter((c) => c.id !== catId);
    if (onUpdateCategories) {
      onUpdateCategories(updatedList);
    }

    // 2. Delete locally immediately
    deleteLocalCategory(catId);
    setDeleteConfirmCat(null);

    // 3. Await delete from Cloud Firestore
    try {
      await deleteCloudCategory(catId);
    } catch (err) {
      console.warn('[Firestore] Category delete warning:', err);
    }

    // 4. Await deletion on server
    try {
      const authToken = token || localStorage.getItem('token') || 'local_session_superadmin';
      await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      console.error('Delete category error:', err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Kelola Kategori Aplikasi</h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur pengelompokan sistem berdasarkan bidang akademik, sarana, kepegawaian, dan tata usaha.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const appCount = applications.filter((a) => a.categoryId === cat.id).length;
          return (
            <div
              key={cat.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {appCount} Aplikasi Terkait
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {cat.description || 'Tidak ada deskripsi tambahan.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(cat)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(cat)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 transition-colors text-xs flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Hapus Kategori?</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Anda yakin ingin menghapus kategori <strong>"{deleteConfirmCat.name}"</strong>?
              {applications.filter((a) => a.categoryId === deleteConfirmCat.id).length > 0 && (
                <span className="block mt-2 text-rose-600 font-medium">
                  Perhatian: Terdapat {applications.filter((a) => a.categoryId === deleteConfirmCat.id).length} aplikasi yang terhubung ke kategori ini.
                </span>
              )}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmCat(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Hapus Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kurikulum & Akademik"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Deskripsi Singkat</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Keterangan cakupan aplikasi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
