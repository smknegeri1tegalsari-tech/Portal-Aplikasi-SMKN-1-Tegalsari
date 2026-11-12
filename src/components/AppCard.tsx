import React, { useState } from 'react';
import {
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
  ExternalLink,
  Star,
  Lock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Application, Category, User } from '../types';

// Map icon names to Lucide icons
export const getAppIcon = (iconName: string, className: string = 'w-6 h-6') => {
  switch (iconName) {
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Laptop':
      return <Laptop className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'FolderCheck':
      return <FolderCheck className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
};

interface AppCardProps {
  app: Application;
  category?: Category;
  currentUser: User | null;
  onOpenApp: (app: Application) => void;
  isFavorite: boolean;
  onToggleFavorite: (appId: string) => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  category,
  currentUser,
  onOpenApp,
  isFavorite,
  onToggleFavorite,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Check if current user has permission to open this app
  const isPublicApp = app.allowedRoles.includes('UMUM');
  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const roleAllowed = currentUser ? app.allowedRoles.includes(currentUser.role) : isPublicApp;
  const userExplicitlyAllowed = currentUser?.allowedAppIds ? currentUser.allowedAppIds.includes(app.id) : false;
  const hasAccess = isManager || roleAllowed || userExplicitlyAllowed || isPublicApp;

  // Visual theme colors based on category
  const getCategoryColor = () => {
    switch (app.categoryId) {
      case 'cat-akademik':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'cat-sarpras':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'cat-kesiswaan':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'cat-kepegawaian':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'cat-administrasi':
        return 'text-teal-700 bg-teal-50 border-teal-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col justify-between rounded-2xl bg-white border transition-all duration-300 p-5 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-900/10 ${
        app.isActive
          ? 'border-slate-200 hover:border-emerald-500 hover:-translate-y-1'
          : 'border-slate-200 opacity-60 bg-slate-50'
      }`}
    >
      {/* Glow highlight on hover */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />

      {/* Top row: Icon, Category & Favorite Star */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            {/* App Icon Container */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105 ${
                app.isActive
                  ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-emerald-900/20'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {getAppIcon(app.iconName, 'w-6 h-6 text-white')}
            </div>

            <div>
              {/* Category Pill */}
              <span
                className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getCategoryColor()}`}
              >
                {category?.name || 'Aplikasi Internal'}
              </span>
              {app.badge && (
                <span className="ml-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                  {app.badge}
                </span>
              )}
            </div>
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(app.id);
            }}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              isFavorite
                ? 'text-amber-500 bg-amber-50 border border-amber-200 hover:bg-amber-100'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title={isFavorite ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>
        </div>

        {/* Application Name & Description */}
        <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1.5">
          {app.name}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {app.description || 'Aplikasi internal sekolah SMKN 1 Tegalsari.'}
        </p>
      </div>

      {/* Bottom Section: Access status & Launch Button */}
      <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col gap-3">
        {/* Metadata info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-mono">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">{app.openCount || 0} dibuka</span>
          </span>

          {/* Status info */}
          {!app.isActive ? (
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <AlertTriangle className="w-3 h-3" /> Pemeliharaan
            </span>
          ) : isPublicApp ? (
            <span className="flex items-center gap-1 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              <CheckCircle className="w-3 h-3" /> Akses Umum (Tanpa Login)
            </span>
          ) : !currentUser ? (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <Lock className="w-3 h-3" /> Perlu Login
            </span>
          ) : hasAccess ? (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle className="w-3 h-3" /> Akses Terbuka
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <Lock className="w-3 h-3" /> Perlu Izin
            </span>
          )}
        </div>

        {/* Action Button: BUKA APLIKASI */}
        <button
          type="button"
          onClick={() => onOpenApp(app)}
          disabled={!app.isActive && !isManager}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            !app.isActive && !isManager
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : !currentUser || hasAccess
              ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-700/20 active:scale-[0.98]'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
          }`}
        >
          {!currentUser ? (
            <>
              <span>BUKA APLIKASI</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </>
          ) : hasAccess ? (
            <>
              <span>BUKA APLIKASI</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>AJUKAN AKSES</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
