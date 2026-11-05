import React from 'react';

interface OfficialLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const OfficialLogo: React.FC<OfficialLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const logoSrc = '/assets/aistudio/Logo_SMK_Negeri_1_Tegalsari_200x200_ce1ff52b.jpg';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official SMKN 1 Tegalsari Image Badge */}
      <div className={`relative shrink-0 ${sizeMap[size]} rounded-xl overflow-hidden bg-white p-0.5 shadow-md border border-slate-700/60`}>
        <img
          src={logoSrc}
          alt="Logo Resmi SMKN 1 Tegalsari"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-extrabold tracking-wider text-slate-100 leading-tight">
            SMKN 1 TEGALSARI
          </span>
          <span className="text-xs font-semibold text-blue-400 tracking-wide">
            PORTAL TERPADU APLIKASI
          </span>
        </div>
      )}
    </div>
  );
};

