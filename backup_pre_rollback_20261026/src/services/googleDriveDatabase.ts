import { auth } from './googleDriveService';
import { GoogleAuthProvider } from 'firebase/auth';

/**
 * DATABASE DE DOCUMENTOS NO GOOGLE DRIVE (REQUISITO 1)
 * Gerencia a persistência autônoma de PDFs, Diários e PEIs em pastas organizadas.
 */

export interface DriveUploadOptions {
  fileName: string;
  grade: string;
  subject: string;
  contentBase64: string;
  mimeType?: string;
}

export class GoogleDriveDatabase {
  private static async getAccessToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado.');
    
    // Tenta obter o token do provedor Google
    const providerData = user.providerData.find(p => p.providerId === 'google.com');
    if (!providerData) throw new Error('Conta Google não vinculada.');

    // Em um ambiente real, usamos reauthentication ou passamos o token guardado no login.
    // Aqui assumimos que o googleDriveService.ts já injetou o token no cache ou usamos o token da sessão.
    // Para simplificar e garantir funcionamento, o frontend deve passar o token.
    const token = (window as any)._driveAccessToken;
    if (!token) throw new Error('Token do Drive não encontrado na sessão.');
    return token;
  }

  /**
   * Salva um documento PDF ou texto no Drive usando a estrutura:
   * AdaptaEdu / [Grade] / [Subject]
   */
  static async saveDocument(options: DriveUploadOptions): Promise<{ success: boolean; webViewLink?: string }> {
    try {
      const token = await this.getAccessToken();
      const folderPath = `AdaptaEdu/${options.grade}/${options.subject}`;

      const response = await fetch('/api/drive/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          fileName: options.fileName,
          folderPath,
          fileContent: options.contentBase64,
          mimeType: options.mimeType || 'application/pdf'
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return { success: true, webViewLink: data.webViewLink };
    } catch (error: any) {
      console.error('[DriveDB] Erro ao salvar:', error);
      return { success: false };
    }
  }

  /**
   * Lista arquivos de uma pasta específica no Drive
   */
  static async listFiles(grade: string, subject: string): Promise<any[]> {
    // Implementação simplificada via proxy se necessário, ou fetch direto se tiver token
    return [];
  }
}

export const driveDB = GoogleDriveDatabase;
