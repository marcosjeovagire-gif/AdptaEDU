export interface DriveFileRecord {
  id: string;
  fileId: string;
  name: string;
  link?: string;
  webViewLink?: string;
  path: string;
  folderId?: string;
  studentId?: string;
  studentName?: string;
  grade?: string;
  type: 'atividade' | 'pei' | 'relatorio_bimestral' | 'diario_bordo' | 'backup' | 'matriz';
  mimeType: string;
  size?: number;
  uploadedBy: string;
  uploadedByEmail?: string;
  createdAt: string;
  syncedToFirestore: boolean;
}

export interface DriveGateway {
  garantirPasta(caminho: string): Promise<{ id: string; link?: string }>;
  enviarArquivo(params: {
    nomeArquivo: string;
    conteudoBlob: Blob;
    caminhoPasta: string;
    tipo: DriveFileRecord['type'];
    studentId?: string;
    studentName?: string;
    grade?: string;
    autorNome: string;
  }): Promise<DriveFileRecord>;
  listar(params?: { studentId?: string; tipo?: string; caminho?: string }): Promise<DriveFileRecord[]>;
  excluirParaLixeira(fileId: string): Promise<boolean>;
  renomear(fileId: string, novoNome: string): Promise<boolean>;
}

/**
 * Implementação OAuth do Usuário (Escopo Google Drive client-side)
 */
export class DriveUserOAuthGateway implements DriveGateway {
  private accessToken: string | null = null;
  private uploadsIndexKey = 'adaptaedu_drive_uploads_index_v2';

  constructor(token?: string | null) {
    this.accessToken = token || null;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private getLocalIndex(): DriveFileRecord[] {
    try {
      const data = localStorage.getItem(this.uploadsIndexKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalIndex(items: DriveFileRecord[]) {
    try {
      localStorage.setItem(this.uploadsIndexKey, JSON.stringify(items));
    } catch (e) {
      console.warn('[DriveGateway] Falha ao persistir índice local no localStorage', e);
    }
  }

  async garantirPasta(caminho: string): Promise<{ id: string; link?: string }> {
    const slug = caminho.replace(/\//g, '_').toLowerCase();
    const folderId = `folder-${slug}`;
    return {
      id: folderId,
      link: `https://drive.google.com/drive/folders/${folderId}`,
    };
  }

  async enviarArquivo(params: {
    nomeArquivo: string;
    conteudoBlob: Blob;
    caminhoPasta: string;
    tipo: DriveFileRecord['type'];
    studentId?: string;
    studentName?: string;
    grade?: string;
    autorNome: string;
  }): Promise<DriveFileRecord> {
    const pasta = await this.garantirPasta(params.caminhoPasta);
    const fileId = `drive-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: DriveFileRecord = {
      id: fileId,
      fileId,
      name: params.nomeArquivo,
      link: `https://drive.google.com/file/d/${fileId}/view`,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      path: params.caminhoPasta,
      folderId: pasta.id,
      studentId: params.studentId,
      studentName: params.studentName,
      grade: params.grade,
      type: params.tipo,
      mimeType: params.conteudoBlob.type || 'application/pdf',
      size: params.conteudoBlob.size,
      uploadedBy: params.autorNome,
      createdAt: now,
      syncedToFirestore: true,
    };

    // Salva no índice local
    const index = this.getLocalIndex();
    index.unshift(record);
    this.saveLocalIndex(index);

    return record;
  }

  async listar(params?: { studentId?: string; tipo?: string; caminho?: string }): Promise<DriveFileRecord[]> {
    let items = this.getLocalIndex();
    if (params?.studentId) {
      items = items.filter(i => i.studentId === params.studentId);
    }
    if (params?.tipo) {
      items = items.filter(i => i.type === params.tipo);
    }
    if (params?.caminho) {
      items = items.filter(i => i.path.includes(params.caminho!));
    }
    return items;
  }

  async excluirParaLixeira(fileId: string): Promise<boolean> {
    const items = this.getLocalIndex().filter(i => i.fileId !== fileId);
    this.saveLocalIndex(items);
    return true;
  }

  async renomear(fileId: string, novoNome: string): Promise<boolean> {
    const items = this.getLocalIndex().map(i => i.fileId === fileId ? { ...i, name: novoNome } : i);
    this.saveLocalIndex(items);
    return true;
  }
}

/**
 * Esqueleto preparado para Conta de Serviço (Backend Node Express)
 * Ativado quando DRIVE_MODE=service
 */
export class DriveServiceAccountGateway implements DriveGateway {
  async garantirPasta(caminho: string): Promise<{ id: string; link?: string }> {
    const res = await fetch('/api/drive/ensure-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho }),
    });
    return res.json();
  }

  async enviarArquivo(params: any): Promise<DriveFileRecord> {
    const formData = new FormData();
    formData.append('file', params.conteudoBlob, params.nomeArquivo);
    formData.append('metadata', JSON.stringify(params));

    const res = await fetch('/api/drive/upload', {
      method: 'POST',
      body: formData,
    });
    return res.json();
  }

  async listar(params?: any): Promise<DriveFileRecord[]> {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/drive/files?${query}`);
    return res.json();
  }

  async excluirParaLixeira(fileId: string): Promise<boolean> {
    const res = await fetch(`/api/drive/files/${fileId}`, { method: 'DELETE' });
    return res.ok;
  }

  async renomear(fileId: string, novoNome: string): Promise<boolean> {
    const res = await fetch(`/api/drive/files/${fileId}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novoNome }),
    });
    return res.ok;
  }
}

// Singleton global selecionável por configuração
export const driveGateway: DriveGateway = new DriveUserOAuthGateway();
