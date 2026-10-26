import React, { useState } from 'react';
import { AlertTriangle, Archive, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';

export type SafeActionType = 'archive' | 'restore' | 'trash' | 'permanent_delete';

interface SafeActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: SafeActionType;
  itemName: string;
  itemType: string;
  isSuperadmin?: boolean;
}

export const SafeActionDialog: React.FC<SafeActionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  itemName,
  itemType,
  isSuperadmin = false,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen) return null;

  const getDialogConfig = () => {
    switch (actionType) {
      case 'archive':
        return {
          title: `Arquivar ${itemType}`,
          description: `O registro "${itemName}" será arquivado e ocultado das listagens padrão, mas permanecerá integralmente preservado no banco de dados.`,
          icon: <Archive className="h-6 w-6 text-amber-600" />,
          btnColor: 'bg-amber-600 hover:bg-amber-700',
          btnText: 'Confirmar Arquivamento',
          requirePhrase: false,
        };
      case 'restore':
        return {
          title: `Restaurar ${itemType}`,
          description: `O registro "${itemName}" será restaurado para a situação ativa e voltará a aparecer nos fluxos normais do sistema.`,
          icon: <RotateCcw className="h-6 w-6 text-emerald-600" />,
          btnColor: 'bg-emerald-600 hover:bg-emerald-700',
          btnText: 'Confirmar Restauração',
          requirePhrase: false,
        };
      case 'trash':
        return {
          title: `Mover para a Lixeira Administrativa`,
          description: `O registro "${itemName}" será transferido para a lixeira administrativa (exclusão lógica). Ele pode ser restaurado a qualquer momento pelo Superadministrador.`,
          icon: <Trash2 className="h-6 w-6 text-rose-600" />,
          btnColor: 'bg-rose-600 hover:bg-rose-700',
          btnText: 'Mover para Lixeira',
          requirePhrase: false,
        };
      case 'permanent_delete':
        return {
          title: `Exclusão Definitiva Irreversível`,
          description: `ATENÇÃO: Você está prestes a apagar DEFINITIVAMENTE o registro "${itemName}". Esta operação é IRREVERSÍVEL, não poderá ser desfeita e removerá todos os vínculos no banco de dados.`,
          icon: <ShieldAlert className="h-6 w-6 text-red-600" />,
          btnColor: 'bg-red-700 hover:bg-red-800',
          btnText: 'EXCLUIR DEFINITIVAMENTE',
          requirePhrase: true,
        };
    }
  };

  const config = getDialogConfig();
  const canConfirm = !config.requirePhrase || (confirmationInput.trim() === 'EXCLUIR DEFINITIVAMENTE' && isSuperadmin);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    setConfirmationInput('');
    onClose();
  };

  const handleCancel = () => {
    setConfirmationInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-slate-100 shrink-0">
            {config.icon}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{config.title}</h3>
            <p className="text-xs text-slate-500 font-medium">Registro: {itemName}</p>
          </div>
        </div>

        {/* Mensagem explicativa */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
          {config.description}
        </div>

        {/* Confirmação reforçada para exclusão definitiva */}
        {config.requirePhrase && (
          <div className="space-y-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-bold text-red-900">
              Para prosseguir com a exclusão irreversível, digite exatamente <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-300">EXCLUIR DEFINITIVAMENTE</span> abaixo:
            </p>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Digite EXCLUIR DEFINITIVAMENTE"
              className="w-full px-3 py-2 text-xs font-mono border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
              autoFocus
            />
            {!isSuperadmin && (
              <p className="text-[11px] text-red-700 font-semibold">
                Apenas o Superadministrador possui privilégio de exclusão definitiva.
              </p>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-xl text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${config.btnColor}`}
          >
            {config.btnText}
          </button>
        </div>

      </div>
    </div>
  );
};
