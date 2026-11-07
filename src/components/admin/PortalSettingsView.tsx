import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, ShieldAlert, School } from 'lucide-react';
import { PortalSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getLocalSettings, saveLocalSettings } from '../../lib/portalStorage';

export const PortalSettingsView: React.FC = () => {
  const { token, isSuperAdmin } = useAuth();
  const [settings, setSettings] = useState<PortalSettings>(() => getLocalSettings());
  const [schoolName, setSchoolName] = useState(() => settings.schoolName || '');
  const [portalTitle, setPortalTitle] = useState(() => settings.portalTitle || '');
  const [tagline, setTagline] = useState(() => settings.tagline || '');
  const [contactHelpdesk, setContactHelpdesk] = useState(() => settings.contactHelpdesk || '');
  const [announcementText, setAnnouncementText] = useState(() => settings.announcementText || '');
  const [maintenanceMode, setMaintenanceMode] = useState(() => settings.maintenanceMode || false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.settings) {
          setSettings(data.settings);
          saveLocalSettings(data.settings);
          setSchoolName(data.settings.schoolName || '');
          setPortalTitle(data.settings.portalTitle || '');
          setTagline(data.settings.tagline || '');
          setContactHelpdesk(data.settings.contactHelpdesk || '');
          setAnnouncementText(data.settings.announcementText || '');
          setMaintenanceMode(data.settings.maintenanceMode || false);
        }
      })
      .catch((err) => console.warn('Fetch settings from server failed, using local settings:', err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setMessage({ type: 'error', text: 'Hanya Super Admin yang berhak mengubah konfigurasi sistem.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const updatedSettings: PortalSettings = {
      ...settings,
      schoolName,
      portalTitle,
      tagline,
      contactHelpdesk,
      announcementText,
      maintenanceMode,
      updatedAt: new Date().toISOString(),
    };

    // 1. Immediately save locally
    saveLocalSettings(updatedSettings);
    setSettings(updatedSettings);

    // 2. Sync to server in background
    try {
      fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedSettings),
      }).catch((err) => {
        console.warn('Server settings sync failed:', err);
      });
    } catch (err) {
      console.warn('Save settings server error:', err);
    }

    setMessage({ type: 'success', text: 'Pengaturan portal berhasil diperbarui.' });
    setIsSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h2 className="text-xl font-black text-slate-900">Konfigurasi Portal Sekolah</h2>
        <p className="text-xs text-slate-500 mt-1">
          Atur identitas lembaga, judul sistem terpadu, kontak pengaduan, dan banner pengumuman.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <label className="block text-slate-700 font-bold mb-1">Nama Resmi Sekolah</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1">Judul Utama Portal</label>
          <input
            type="text"
            value={portalTitle}
            onChange={(e) => setPortalTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1">Motto / Tagline Portal</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1">Teks Pengumuman Berjalan / Banner</label>
          <textarea
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1">Kontak Helpdesk & Dukungan IT</label>
          <input
            type="text"
            value={contactHelpdesk}
            onChange={(e) => setContactHelpdesk(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* Maintenance Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="font-bold text-slate-900 block">Mode Pemeliharaan (Maintenance)</span>
            <span className="text-[10px] text-slate-500">
              Jika aktif, hanya Super Admin yang dapat membuka aplikasi internal sekolah.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
              maintenanceMode ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {maintenanceMode ? 'Aktif (Darurat)' : 'Normal (Online)'}
          </button>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-60 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
