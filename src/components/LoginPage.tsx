import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OfficialLogo } from './OfficialLogo';
import { SCHOOL_INFO } from '../lib/schoolData';
import { Application } from '../types';

interface LoginPageProps {
  pendingApp?: Application | null;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  pendingApp,
  onCancel,
  onSuccess,
}) => {
  const { login, isLoading, error: authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setClientError('Silakan masukkan username Anda.');
      return;
    }
    if (!password) {
      setClientError('Silakan masukkan kata sandi Anda.');
      return;
    }

    const success = await login(cleanUsername, password);
    if (success) {
      if (onSuccess) onSuccess();
    } else if (!authError) {
      setClientError('Username atau password yang Anda masukkan tidak sesuai.');
    }
  };

  const activeError = clientError || authError;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f0f4f2] text-slate-900 relative overflow-hidden select-none">
      {/* Background Decorative Mesh Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-gradient-to-b from-emerald-100/60 via-teal-50/40 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Navigation */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-emerald-900/10 backdrop-blur-md bg-white/90 shadow-sm">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold mr-2 cursor-pointer shadow-xs"
              title="Kembali ke halaman utama katalog"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Katalog Aplikasi</span>
            </button>
          )}
          <OfficialLogo size="md" />
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span>{SCHOOL_INFO.fullName}</span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {SCHOOL_INFO.akreditasi}
              </span>
            </h1>
            <p className="text-xs text-slate-500">Pusat Layanan Aplikasi & Sistem Informasi Internal Terpadu</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 font-medium bg-emerald-50/60 px-3 py-1.5 rounded-xl border border-emerald-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sesi Keamanan Terenkripsi</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Card Frame */}
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400" />

            {/* School Crest & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex justify-center items-center p-2 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm mb-3">
                <OfficialLogo size="lg" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                Portal Terpadu Aplikasi
              </h2>
              <p className="text-sm font-extrabold text-emerald-700 tracking-wide mt-1">
                SMK NEGERI 1 TEGALSARI
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Silakan masuk dengan akun terdaftar untuk membuka sistem internal sekolah
              </p>
            </div>

            {/* Targeted Application Request Banner */}
            {pendingApp && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3 shadow-xs animate-fadeIn">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="font-extrabold text-emerald-950 block">Otentikasi Diperlukan</span>
                  <span className="text-slate-600">
                    Masuk ke portal untuk membuka aplikasi <strong className="text-emerald-800 font-bold">{pendingApp.name}</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {activeError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1 font-semibold leading-relaxed">{activeError}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                    title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Hak Akses...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>MASUK KE PORTAL</span>
                  </>
                )}
              </button>
            </form>

            {/* School Helpdesk note */}
            <div className="mt-5 pt-3 text-center border-t border-slate-100">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <Building className="w-3 h-3 text-slate-400" />
                Lupa sandi? Hubungi Tim IT SMKN 1 Tegalsari
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-4 border-t border-slate-200 bg-white/80 text-center text-xs text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} {SCHOOL_INFO.fullName}. Hak Cipta Dilindungi Undang-Undang.
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {SCHOOL_INFO.address} | NPSN: {SCHOOL_INFO.npsn}
        </p>
      </footer>
    </div>
  );
};
