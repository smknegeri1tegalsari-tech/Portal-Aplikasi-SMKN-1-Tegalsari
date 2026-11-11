import React from 'react';
import {
  HelpCircle,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Laptop,
  AlertTriangle,
  Mail,
  Phone,
  School,
  CheckCircle2,
} from 'lucide-react';
import { SCHOOL_INFO } from '../lib/schoolData';

export const GuideView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-900 border border-emerald-700 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-200">
            Pusat Bantuan & Panduan Pengguna
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Panduan Penggunaan Portal Terpadu SMKN 1 Tegalsari
        </h2>
        <p className="text-xs text-emerald-100 mt-1 leading-relaxed max-w-2xl">
          Satu akun untuk seluruh aplikasi internal sekolah. Pelajari cara membuka aplikasi, hak akses, dan prosedur keamanan akun.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Step 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">Masuk dengan Akun Resmi</h3>
          <p className="text-slate-600 leading-relaxed font-normal">
            Seluruh civitas akademika (Guru, Karyawan, dan Siswa) wajib login menggunakan username dan kata sandi yang telah didaftarkan oleh tim administrator IT sekolah.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-black">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">Pencarian & Filter Aplikasi</h3>
          <p className="text-slate-600 leading-relaxed font-normal">
            Gunakan kolom pencarian di dashboard untuk menemukan aplikasi dengan cepat, atau gunakan tab kategori (Akademik, Sarpras, Kepegawaian, Kesiswaan, Administrasi).
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">Verifikasi Akses & Peluncuran Aman</h3>
          <p className="text-slate-600 leading-relaxed font-normal">
            Ketika Anda mengklik tombol "BUKA APLIKASI", server secara otomatis memverifikasi hak akses peran Anda dan mencatat riwayat peluncuran ke dalam sistem audit log demi keamanan data sekolah.
          </p>
        </div>

        {/* Step 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-black">
            4
          </div>
          <h3 className="text-sm font-bold text-slate-900">Keamanan & Logout</h3>
          <p className="text-slate-600 leading-relaxed font-normal">
            Jangan pernah membagikan username dan password kepada pihak lain. Pastikan selalu menekan tombol Keluar (Logout) setelah selesai bertugas, terutama di perangkat komputer bersama/lab.
          </p>
        </div>
      </div>

      {/* Roles & Permissions Explanation */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tingkatan Hak Akses Peran (Role-Based Access Control)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
              SUPER ADMIN
            </span>
            <p className="text-slate-900 mt-2 font-bold">Manajemen Penuh Portal</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Akses tak terbatas untuk mengelola semua aplikasi, seluruh pengguna, reset password, audit log, dan pengaturan global.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-300">
              ADMIN
            </span>
            <p className="text-slate-900 mt-2 font-bold">Pengelola Aplikasi & GTK</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Dapat menambah atau mengedit tautan aplikasi, memantau daftar pengguna, mengelola kategori, dan meninjau log aktivitas.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
              GURU
            </span>
            <p className="text-slate-900 mt-2 font-bold">Tenaga Pendidik / Guru</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Dapat membuka aplikasi akademik, sistem penilaian, presensi guru, dan aplikasi pembelajaran sesuai hak akses.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-300">
              SISWA
            </span>
            <p className="text-slate-900 mt-2 font-bold">Siswa / Peserta Didik</p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Dapat membuka aplikasi CBT ujian online, e-learning siswa, perpustakaan digital, dan materi pembelajaran yang diizinkan.
            </p>
          </div>
        </div>
      </div>

      {/* IT Helpdesk Contact Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{SCHOOL_INFO.fullName}</h4>
            <p className="text-slate-600">{SCHOOL_INFO.address}</p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span>{SCHOOL_INFO.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Telepon: {SCHOOL_INFO.phone}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
