import React, { useState, useEffect, useRef } from 'react';
import { 
  LOGO_ESCOLA_BASE64, 
  getLogoEscolaBase64, 
  setLogoEscolaBase64Storage 
} from '../../assets/branding/logoEscolaBase64';
import { Upload, Image as ImageIcon } from 'lucide-react';

export { LOGO_ESCOLA_BASE64, getLogoEscolaBase64 };

export interface LogoOlyntoProps {
  variant?: 'login' | 'header' | 'pdf' | 'print' | 'custom';
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  clickable?: boolean;
  onClick?: () => void;
  title?: string;
}

/**
 * Componente oficial <LogoOlynto/>
 * Renderiza a imagem do logo do Colégio Estadual Olynto Pereira de Castro e SEDUC-GO
 * utilizando estritamente a variável global LOGO_ESCOLA_BASE64 em uma tag <img>.
 * Proibido recriar via SVG ou CSS.
 */
export const LogoOlynto: React.FC<LogoOlyntoProps> = ({
  variant = 'custom',
  className = '',
  style = {},
  alt = 'Colégio Estadual Olynto Pereira de Castro - Secretaria de Estado da Educação de Goiás',
  clickable = false,
  onClick,
  title = 'Colégio Estadual Olynto Pereira de Castro',
}) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => getLogoEscolaBase64());
  const [showUploaderModal, setShowUploaderModal] = useState<boolean>(false);
  const [base64Input, setBase64Input] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setLogoSrc(getLogoEscolaBase64());
    };
    window.addEventListener('logo_escola_updated', handleUpdate);
    return () => window.removeEventListener('logo_escola_updated', handleUpdate);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoEscolaBase64Storage(result);
        setLogoSrc(result);
        setShowUploaderModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePastedBase64 = () => {
    if (base64Input.trim().length > 0) {
      const clean = base64Input.trim().startsWith('data:image') 
        ? base64Input.trim() 
        : `data:image/png;base64,${base64Input.trim()}`;
      setLogoEscolaBase64Storage(clean);
      setLogoSrc(clean);
      setShowUploaderModal(false);
    }
  };

  // Regras de Estilo CSS específicas solicitadas pelo usuário:
  // 1. Header: max-height: 60px; width: auto; object-fit: contain;
  // 2. Login: max-width: 300px; height: auto; margin-bottom: 20px; object-fit: contain;
  // 3. PDF: cabeçalho do documento mantendo a proporção original
  const getVariantStyles = (): { cssStyle: React.CSSProperties; cssClass: string } => {
    switch (variant) {
      case 'header':
        return {
          cssStyle: {
            maxHeight: '60px',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
            ...style,
          },
          cssClass: 'max-h-[60px] w-auto object-contain block flex-shrink-0 shrink-0',
        };
      case 'login':
        return {
          cssStyle: {
            maxWidth: '300px',
            height: 'auto',
            marginBottom: '20px',
            objectFit: 'contain',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            flexShrink: 0,
            ...style,
          },
          cssClass: 'max-w-[300px] w-full h-auto mb-5 object-contain mx-auto block flex-shrink-0 shrink-0',
        };
      case 'pdf':
      case 'print':
        return {
          cssStyle: {
            maxHeight: '40px',
            maxWidth: '120px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            marginRight: 'auto',
            flexShrink: 0,
            alignSelf: 'flex-start',
            ...style,
          },
          cssClass: 'pdf-school-logo max-h-[40px] max-w-[120px] w-auto h-auto object-contain block flex-shrink-0 shrink-0 self-start',
        };
      default:
        return {
          cssStyle: {
            objectFit: 'contain',
            height: 'auto',
            maxWidth: '100%',
            display: 'block',
            ...style,
          },
          cssClass: 'object-contain block',
        };
    }
  };

  const { cssStyle, cssClass } = getVariantStyles();

  // Caso o usuário ainda não tenha colado a string Base64 no código ou feito upload
  if (!logoSrc || logoSrc.trim().length === 0) {
    return (
      <>
        <div 
          onClick={() => setShowUploaderModal(true)}
          style={cssStyle} 
          className={`${cssClass} border-2 border-dashed border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 rounded-xl p-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs group`}
          title="Clique para carregar o arquivo PNG oficial ou colar o Base64"
        >
          <ImageIcon className="h-4 w-4 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-center">
            {variant === 'header' ? 'Carregar Logo (.png)' : 'Carregar Logo Oficial 2026 (.png)'}
          </span>
          <Upload className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        </div>

        {/* Modal interativo para selecionar o arquivo PNG ou colar Base64 */}
        {showUploaderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900">
                <ImageIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  Identidade Visual Oficial da Escola
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Carregue o arquivo anexado <strong>"Logo Escola 2026 geral com SEDUC - Estado .png"</strong> para exibição imediata em Base64 no cabeçalho, tela de login e PDFs.
              </p>

              <div className="space-y-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/png,image/jpeg" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo PNG do Meu Dispositivo
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="shrink-0 mx-2 text-[10px] text-slate-400 font-semibold uppercase">ou cole a string base64</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <textarea
                  value={base64Input}
                  onChange={(e) => setBase64Input(e.target.value)}
                  placeholder="data:image/png;base64,iVBORw0KGgoAAA..."
                  className="w-full h-20 p-2 text-[11px] font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploaderModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePastedBase64}
                    disabled={base64Input.trim().length === 0}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black disabled:opacity-40 rounded-lg"
                  >
                    Salvar Base64
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Renderização obrigatória da tag <img> com LOGO_ESCOLA_BASE64
  return (
    <img
      src={logoSrc}
      alt={alt}
      title={title}
      style={cssStyle}
      className={`${cssClass} ${className} transition-opacity duration-200 hover:opacity-80 cursor-pointer`}
      onClick={clickable ? onClick : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      loading="eager"
      decoding="sync"
    />
  );
};

export default LogoOlynto;
