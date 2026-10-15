import React, { useState } from 'react';
import { UserRole } from '../../types';
import { 
  getActiveInstitutionalLogo, 
  getLogoTooltip 
} from '../../services/brandingService';
import { OfficialInstitutionalLogoSvg } from '../../assets/branding/logoAsset';
import { OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL } from '../../assets/branding/logoDataUrl';

export interface InstitutionalLogoProps {
  variant?: 'header' | 'login' | 'dashboard' | 'compact' | 'pdf' | 'print' | 'mobile';
  width?: number | string;
  maxWidth?: number | string;
  clickable?: boolean;
  destination?: string;
  showFallback?: boolean;
  className?: string;
  printMode?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  currentActiveRole?: UserRole | null;
  currentUserRoles?: UserRole[];
  isMaster?: boolean;
}

export const InstitutionalLogo: React.FC<InstitutionalLogoProps> = ({
  variant = 'header',
  width,
  maxWidth,
  clickable = false,
  destination,
  showFallback = true,
  className = '',
  printMode = false,
  onLoad,
  onError,
  onClick,
  currentActiveRole = null,
  isMaster = false,
}) => {
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);
  const [vectorLoadError, setVectorLoadError] = useState<boolean>(false);
  const logoMeta = getActiveInstitutionalLogo();

  // Dimensionamento calibrado com base nas Seções 5, 7 e 8
  const getDimensionsByVariant = () => {
    switch (variant) {
      case 'login':
        return {
          width: width || '100%',
          maxWidth: maxWidth || '360px',
          maxHeight: '80px',
          imgClass: 'w-full max-w-[340px] sm:max-w-[380px] h-auto object-contain mx-auto block shrink-0',
        };
      case 'header':
        return {
          width: width || 'auto',
          maxWidth: maxWidth || '330px',
          maxHeight: '60px',
          imgClass: 'w-auto max-h-[60px] max-w-[330px] object-contain block shrink-0',
        };
      case 'compact':
      case 'mobile':
        return {
          width: width || 'auto',
          maxWidth: maxWidth || '220px',
          maxHeight: '48px',
          imgClass: 'w-auto max-w-[180px] sm:max-w-[220px] h-9 sm:h-11 object-contain block shrink-0',
        };
      case 'dashboard':
        return {
          width: width || '100%',
          maxWidth: maxWidth || '420px',
          maxHeight: '120px',
          imgClass: 'w-full max-w-[420px] h-auto object-contain block shrink-0',
        };
      case 'pdf':
      case 'print':
        return {
          width: width || 'auto',
          maxWidth: maxWidth || '120px',
          maxHeight: '40px',
          imgClass: 'pdf-school-logo w-auto max-h-[40px] max-w-[120px] h-auto object-contain block shrink-0 self-start',
        };
      default:
        return {
          width: width || 'auto',
          maxWidth: maxWidth || '300px',
          maxHeight: '64px',
          imgClass: 'w-auto max-w-[300px] h-auto object-contain block shrink-0',
        };
    }
  };

  const dim = getDimensionsByVariant();
  const tooltipText = getLogoTooltip(currentActiveRole, isMaster);
  const altText = "Identidade institucional do Colégio Estadual Olynto Pereira de Castro, Secretaria de Estado da Educação e Governo de Goiás";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (clickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const handleImgError = () => {
    setImgLoadError(true);
    if (onError) onError();
  };

  const handleImgLoad = () => {
    if (onLoad) onLoad();
  };

  // Se ambos imagem e vetor falharem, exibe fallback textual institucional
  if (imgLoadError && vectorLoadError && showFallback) {
    return (
      <div 
        className={`flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 ${className}`}
        title={tooltipText}
        onClick={clickable ? onClick : undefined}
      >
        <div className="h-8 w-8 rounded-md bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
          OPC
        </div>
        <div className="leading-tight text-left">
          <span className="font-extrabold text-xs block text-slate-900">Colégio Estadual Olynto Pereira de Castro</span>
          <span className="text-[10px] text-emerald-800 font-semibold block">Secretaria de Estado da Educação • Goiás</span>
        </div>
      </div>
    );
  }

  // Se a tag img falhar, renderiza o componente vetorial direto que NUNCA falha
  const renderVectorFallback = () => (
    <div 
      className={`${dim.imgClass} flex items-center justify-center`}
      style={{
        maxWidth: dim.maxWidth,
        maxHeight: dim.maxHeight,
        aspectRatio: '820 / 280',
      }}
    >
      <OfficialInstitutionalLogoSvg 
        className="w-full h-full object-contain" 
        style={{ maxHeight: dim.maxHeight }} 
      />
    </div>
  );

  // Conteúdo da logo com prioridade:
  // 1. Tag <img> apontando para logoMeta.publicUrl ou OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL
  // 2. Se ocorrer erro de decodificação na tag img, renderiza o SVG vetorial nativo
  const content = imgLoadError ? (
    renderVectorFallback()
  ) : (
    <img
      src={logoMeta.publicUrl || OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL}
      alt={altText}
      className={`${dim.imgClass} transition-transform duration-150 ${clickable ? 'group-hover:opacity-95 group-active:scale-[0.99]' : ''}`}
      style={{
        maxWidth: dim.maxWidth,
        maxHeight: dim.maxHeight,
        aspectRatio: '820 / 280',
        objectFit: 'contain',
        objectPosition: 'center',
        width: dim.width,
        height: 'auto',
        display: 'block',
      }}
      onError={handleImgError}
      onLoad={handleImgLoad}
      loading="eager"
      decoding="sync"
    />
  );

  if (clickable && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={`group inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg cursor-pointer transition-all bg-transparent border-0 p-0 text-left ${className}`}
        title={tooltipText}
        aria-label={tooltipText}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {content}
    </div>
  );
};
