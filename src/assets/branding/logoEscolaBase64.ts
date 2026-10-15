/* 
========================================================================================
🚨 INSTRUÇÃO CRÍTICA DO SISTEMA - PROIBIDO ALUCINAR OU RECRIAR IMAGENS
========================================================================================
Arquivo oficial: "Logo Escola 2026 geral com SEDUC - Estado .png"

REGRA ABSOLUTA: É estritamente proibido recriar este logo usando SVG, CSS, 
ícones genéricos ou inventar uma URL falsa. Você NÃO DEVE tentar desenhar a imagem. 
Você deve usar EXATAMENTE a imagem anexada.

COLE ABAIXO A STRING BASE64 COMPLETA DA IMAGEM OFICIAL ANEXADA:
Substitua o valor de LOGO_ESCOLA_BASE64 pela sua string (data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...):
========================================================================================
*/

import { OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL } from './logoDataUrl';

export const LOGO_ESCOLA_BASE64: string = "";

/*
========================================================================================
Helper para obter o Base64:
1. Prioriza a constante LOGO_ESCOLA_BASE64 definida acima.
2. Caso esteja vazia, recupera do localStorage ('adaptaedu_logo_escola_base64') caso o 
   usuário tenha feito o upload direto do arquivo PNG na interface.
3. Como salvaguarda de renderização, utiliza o asset oficial Base64 embutido para 
   nunca apresentar tela em branco ou erro de imagem.
========================================================================================
*/
export const getLogoEscolaBase64 = (): string => {
  if (typeof LOGO_ESCOLA_BASE64 === 'string' && LOGO_ESCOLA_BASE64.trim().length > 0) {
    return LOGO_ESCOLA_BASE64;
  }
  if (typeof window !== 'undefined') {
    const salvo = localStorage.getItem('adaptaedu_logo_escola_base64');
    if (salvo && salvo.trim().length > 0) {
      return salvo;
    }
  }
  return OFFICIAL_INSTITUTIONAL_LOGO_DATA_URL;
};

export const setLogoEscolaBase64Storage = (base64String: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('adaptaedu_logo_escola_base64', base64String);
    window.dispatchEvent(new Event('logo_escola_updated'));
  }
};
