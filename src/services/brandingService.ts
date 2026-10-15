/**
 * Branding Service - Central de Identidade Visual Oficial
 * Colégio Estadual Olynto Pereira de Castro & SEDUC Goiás
 */
import { UserRole } from '../types';
import { OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL } from '../assets/branding/logoDataUrl';
import { LOGO_ESCOLA_BASE64 } from '../assets/branding/logoEscolaBase64';

export { LOGO_ESCOLA_BASE64 };

export interface InstitutionalLogoMetadata {
  id: string;
  originalFileName: string;
  internalFileName: string;
  assetType: 'institutional-logo';
  schoolId: string;
  schoolName: string;
  active: boolean;
  isPrimary: boolean;
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  version: string;
  updatedAt: string;
  updatedBy: string;
  storagePath: string;
  publicUrl: string;
  dataUrl?: string;
  description: string;
  altText: string;
}

export interface BrandingConfiguration {
  logoUrl: string;
  logoFileName: string;
  logoType: 'horizontal' | 'internal-default';
  logoActive: boolean;
  logoVersion: number;
  schoolId: string;
  schoolName: string;
  logoUpdatedAt: string;
  logoUpdatedBy: string;
  // Configurações do cabeçalho de atividades e PDF
  exibirLogo: boolean;
  centralizarLogo: boolean;
  preservarProporcao: boolean;
  larguraPrimeiraPaginaMm: number;
  repetirLogoPaginasSeguintes: boolean;
  larguraPaginasSeguintesMm: number;
  exibirNomeTextual: boolean;
  exibirSecretaria: boolean;
  exibirEndereco: boolean;
  exibirMunicipio: boolean;
  exibirRodape: boolean;
  textoRodape: string;
  posicaoAssinatura: 'fim_atividade' | 'rodape';
  margensMm: number;
  tamanhoPapel: 'A4';
  modoImpressao: 'colorido' | 'escala_cinza';
}

export interface LogoVersionHistory {
  id: string;
  version: string;
  fileName: string;
  url: string;
  createdAt: string;
  createdBy: string;
  reason: string;
  active: boolean;
  dimensions: string;
}

export const ESCOLA_ESTADO_INICIAL = {
  schoolId: 'olynto-pereira-castro',
  schoolName: 'Colégio Estadual Olynto Pereira de Castro',
  logoType: 'internal-default',
  logoActive: true,
  logoVersion: 1,
};

export const LOGO_METADATA_INICIAL: InstitutionalLogoMetadata = {
  id: 'logo-primary-2026',
  originalFileName: 'Logo Escola 2026 geral com SEDUC - Estado .png',
  internalFileName: 'logo-escola-2026.png',
  assetType: 'institutional-logo',
  schoolId: 'olynto-pereira-castro',
  schoolName: 'Colégio Estadual Olynto Pereira de Castro',
  active: true,
  isPrimary: true,
  dimensions: {
    width: 820,
    height: 280,
    aspectRatio: '2.93:1',
  },
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  updatedBy: 'MARCOS ANTONIO FERREIRA',
  storagePath: 'schools/olynto-pereira-castro/branding/logo-escola-2026.png',
  publicUrl: OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL,
  dataUrl: OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL,
  description: 'Composição institucional horizontal unificada com identidade do Colégio Estadual Olynto Pereira de Castro, Secretaria de Estado da Educação e brasão do Estado de Goiás.',
  altText: 'Identidade institucional do Colégio Estadual Olynto Pereira de Castro, Secretaria de Estado da Educação e Governo de Goiás',
};

export const BRANDING_CONFIG_PADRAO: BrandingConfiguration = {
  schoolId: 'olynto-pereira-castro',
  schoolName: 'Colégio Estadual Olynto Pereira de Castro',
  logoUrl: OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL,
  logoFileName: 'Logo Escola 2026 geral com SEDUC - Estado .png',
  logoType: 'internal-default',
  logoActive: true,
  logoVersion: 1,
  logoUpdatedAt: new Date().toISOString(),
  logoUpdatedBy: 'MARCOS ANTONIO FERREIRA',
  exibirLogo: true,
  centralizarLogo: true,
  preservarProporcao: true,
  larguraPrimeiraPaginaMm: 165,
  repetirLogoPaginasSeguintes: true,
  larguraPaginasSeguintesMm: 105,
  exibirNomeTextual: true,
  exibirSecretaria: true,
  exibirEndereco: false,
  exibirMunicipio: true,
  exibirRodape: true,
  textoRodape: 'Colégio Estadual Olynto Pereira de Castro • Secretaria de Estado da Educação de Goiás • AdaptaEdu Escolar',
  posicaoAssinatura: 'fim_atividade',
  margensMm: 15,
  tamanhoPapel: 'A4',
  modoImpressao: 'colorido',
};

export const HISTORICO_VERSOES_LOGO: LogoVersionHistory[] = [
  {
    id: 'ver-1.0.0',
    version: 'v1.0.0',
    fileName: 'Logo Escola 2026 geral com SEDUC - Estado .png',
    url: OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL,
    createdAt: new Date().toISOString(),
    createdBy: 'MARCOS ANTONIO FERREIRA (Superadmin)',
    reason: 'Implantação da identidade visual oficial unificada de 2026 (arquivo interno padrão)',
    active: true,
    dimensions: '820 x 280 px (Horizontal Oficial)',
  }
];

/**
 * 4. SERVIÇO CENTRAL DE IDENTIDADE VISUAL
 * getActiveInstitutionalLogo()
 * Prioridade:
 * 1. logo ativa configurada no Firebase / Storage / customizada, quando válida;
 * 2. logo oficial interna anexada a este projeto (Data URI / SVG bundle);
 * 3. fallback textual.
 */
export function getActiveInstitutionalLogo(): InstitutionalLogoMetadata {
  try {
    const saved = localStorage.getItem('adaptaedu_logo_metadata');
    if (saved) {
      const parsed: InstitutionalLogoMetadata = JSON.parse(saved);
      // Se existir logo válida configurada
      if (parsed && parsed.active && parsed.publicUrl) {
        return parsed;
      }
    }
  } catch {
    // fallback seguro
  }
  return LOGO_METADATA_INICIAL;
}

export function getBrandingConfiguration(): BrandingConfiguration {
  try {
    const saved = localStorage.getItem('adaptaedu_branding_config');
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback seguro
  }
  return BRANDING_CONFIG_PADRAO;
}

export function updateBrandingConfiguration(newConfig: Partial<BrandingConfiguration>): BrandingConfiguration {
  const current = getBrandingConfiguration();
  const updated: BrandingConfiguration = {
    ...current,
    ...newConfig,
    logoUpdatedAt: new Date().toISOString(),
  };
  localStorage.setItem('adaptaedu_branding_config', JSON.stringify(updated));
  return updated;
}

export function replaceInstitutionalLogo(params: {
  fileName: string;
  dataUrl: string;
  dimensions?: { width: number; height: number };
  justification: string;
  userName: string;
}): { success: boolean; logo: InstitutionalLogoMetadata; message: string } {
  const current = getActiveInstitutionalLogo();
  const newVersion = `1.${Date.now().toString().slice(-3)}.0`;

  const updatedLogo: InstitutionalLogoMetadata = {
    ...current,
    originalFileName: params.fileName,
    publicUrl: params.dataUrl,
    dataUrl: params.dataUrl,
    version: newVersion,
    updatedAt: new Date().toISOString(),
    updatedBy: params.userName,
    dimensions: params.dimensions ? {
      width: params.dimensions.width,
      height: params.dimensions.height,
      aspectRatio: `${(params.dimensions.width / params.dimensions.height).toFixed(2)}:1`,
    } : current.dimensions,
  };

  localStorage.setItem('adaptaedu_logo_metadata', JSON.stringify(updatedLogo));

  const savedHistory = localStorage.getItem('adaptaedu_logo_history');
  const history: LogoVersionHistory[] = savedHistory ? JSON.parse(savedHistory) : HISTORICO_VERSOES_LOGO;
  history.unshift({
    id: `ver-${Date.now()}`,
    version: `v${newVersion}`,
    fileName: params.fileName,
    url: params.dataUrl,
    createdAt: new Date().toISOString(),
    createdBy: params.userName,
    reason: params.justification,
    active: true,
    dimensions: `${updatedLogo.dimensions.width} x ${updatedLogo.dimensions.height} px`,
  });
  localStorage.setItem('adaptaedu_logo_history', JSON.stringify(history));

  return {
    success: true,
    logo: updatedLogo,
    message: 'Logo institucional substituída com sucesso no sistema e novos PDFs.',
  };
}

export function restoreInstitutionalLogoVersion(versionId: string, userName: string): boolean {
  const savedHistory = localStorage.getItem('adaptaedu_logo_history');
  const history: LogoVersionHistory[] = savedHistory ? JSON.parse(savedHistory) : HISTORICO_VERSOES_LOGO;
  const target = history.find(h => h.id === versionId);
  if (!target) return false;

  const current = getActiveInstitutionalLogo();
  const updatedLogo: InstitutionalLogoMetadata = {
    ...current,
    originalFileName: target.fileName,
    publicUrl: target.url,
    dataUrl: target.url,
    version: target.version.replace('v', ''),
    updatedAt: new Date().toISOString(),
    updatedBy: `${userName} (Restauração)`,
  };

  localStorage.setItem('adaptaedu_logo_metadata', JSON.stringify(updatedLogo));
  return true;
}

/**
 * Seção 9: Função getHomeRouteByCurrentRole()
 * Considera authMode, currentRole, roles e rota atual
 */
export function getHomeRouteByCurrentRole(params: {
  authMode?: 'preview' | 'production' | 'authenticated';
  currentRole?: UserRole | null;
  roles?: UserRole[];
  currentPath?: string;
  isMasterDataCenter?: boolean;
}): string {
  const { authMode = 'preview', currentRole, roles = [], currentPath = '', isMasterDataCenter = false } = params;

  if (currentPath === '/login' || (!currentRole && roles.length === 0)) {
    return '/login';
  }

  if (isMasterDataCenter) {
    return authMode === 'production' ? '/coordinator' : '/coordinator-preview';
  }

  if (currentRole === 'coordinator' || roles.includes('coordinator') || roles.includes('superadmin')) {
    return authMode === 'production' ? '/coordinator' : '/coordinator-preview';
  }

  if (currentRole === 'teacher' || roles.includes('teacher')) {
    return authMode === 'production' ? '/teacher' : '/teacher-preview';
  }

  return '/login';
}

/**
 * Seção 10: Retorna o tooltip discreto correspondente ao espaço
 */
export function getLogoTooltip(currentRole?: UserRole | null, isMaster?: boolean): string {
  if (isMaster) {
    return 'Voltar ao painel da Coordenação';
  }
  if (currentRole === 'coordinator') {
    return 'Voltar ao início da Coordenação';
  }
  if (currentRole === 'teacher') {
    return 'Voltar ao início do Professor';
  }
  return 'Voltar ao início do AdaptaEdu Escolar';
}
