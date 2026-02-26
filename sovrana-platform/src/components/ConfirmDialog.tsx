'use client';

import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    info: <Info className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle className="w-6 h-6 text-emerald-500" />,
  };

  const btnClasses = {
    danger: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-200',
    warning: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-200',
    info: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-200',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-200',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-50' :
          variant === 'warning' ? 'bg-amber-50' :
          variant === 'info' ? 'bg-blue-50' :
          'bg-emerald-50'
        }`}>
          {icons[variant]}
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-secondary py-2.5 text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            disabled={loading}
            className={`flex-1 text-white py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${btnClasses[variant]} disabled:opacity-60`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
