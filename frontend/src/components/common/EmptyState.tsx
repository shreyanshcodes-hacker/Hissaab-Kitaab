import React from 'react';
import { Receipt, Search, FileQuestion, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'receipt' | 'search' | 'generic' | React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'receipt',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className,
}) => {
  const iconElements = {
    receipt: <Receipt className="w-8 h-8 text-primary" />,
    search: <Search className="w-8 h-8 text-on-surface-variant" />,
    generic: <FileQuestion className="w-8 h-8 text-on-surface-variant" />,
  };

  const renderedIcon =
    typeof icon === 'string'
      ? iconElements[icon as keyof typeof iconElements] || iconElements.generic
      : icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-space-xl rounded-2xl border border-dashed border-outline bg-surface-container-lowest/50 my-4',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4 shadow-sm">
        {renderedIcon}
      </div>
      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1 max-w-md">
        {title}
      </h3>
      <p className="text-body-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <Button
              variant="primary"
              onClick={onAction}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
