import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const icons = {
    danger: (
      <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-6 h-6" />
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-6 h-6" />
      </div>
    ),
    primary: (
      <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-6 h-6" />
      </div>
    ),
  };

  const buttonVariants = {
    danger: 'destructive' as const,
    warning: 'amber' as const,
    primary: 'primary' as const,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center p-2">
        {icons[variant]}
        <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-4 mb-2">
          {title}
        </h4>
        <div className="text-body-sm text-on-surface-variant leading-relaxed mb-6">
          {message}
        </div>
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
