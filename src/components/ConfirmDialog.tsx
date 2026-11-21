import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
  busy?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  dialog,
  onClose,
  busy = false,
}) => {
  if (!dialog?.open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#101217] border border-white/10 p-5 shadow-2xl text-zinc-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                dialog.destructive
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-[#8ba3ff]/15 text-[#8ba3ff]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-white">
              {dialog.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close confirmation dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
          {dialog.description}
        </p>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={dialog.onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              dialog.destructive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#8ba3ff] hover:bg-[#a0b4ff] text-[#090b10]'
            }`}
          >
            {busy ? 'Working…' : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
