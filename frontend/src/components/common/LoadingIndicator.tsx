import React from 'react';
import { Loader2, CheckCircle2, CircleDot, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-4', className)}>
      <Loader2 className={cn('animate-spin text-primary-container', sizes[size])} />
      {label && <p className="text-body-sm font-medium text-on-surface-variant">{label}</p>}
    </div>
  );
};

export interface OCRStage {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export interface OCRAssistantProgressProps {
  stages: OCRStage[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const OCRAssistantProgress: React.FC<OCRAssistantProgressProps> = ({
  stages,
  title = 'Reading your wholesale receipt…',
  subtitle = 'Gemini AI is parsing items, rates, and tax slabs',
  className,
}) => {
  return (
    <div
      className={cn(
        'p-space-lg bg-surface-container-lowest rounded-2xl border border-outline shadow-card max-w-lg w-full',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <div>
          <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h4>
          <p className="text-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isActive = stage.status === 'active';
          const isError = stage.status === 'error';

          return (
            <div key={stage.id} className="flex items-start gap-3 relative">
              {/* Connector line */}
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    'absolute left-3.5 top-7 w-0.5 h-6 -ml-px transition-colors duration-300',
                    isCompleted ? 'bg-verified' : 'bg-outline'
                  )}
                />
              )}

              {/* Status Icon */}
              <div className="flex-shrink-0 z-10">
                {isCompleted ? (
                  <CheckCircle2 className="w-7 h-7 text-verified" />
                ) : isActive ? (
                  <CircleDot className="w-7 h-7 text-primary-container animate-spin" />
                ) : isError ? (
                  <AlertCircle className="w-7 h-7 text-error" />
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-outline bg-surface-container flex items-center justify-center text-label-xs text-on-surface-variant font-bold">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className={cn(
                    'text-body-sm font-semibold leading-tight',
                    isCompleted && 'text-on-surface',
                    isActive && 'text-primary-container font-bold',
                    stage.status === 'pending' && 'text-on-surface-variant/60',
                    isError && 'text-error'
                  )}
                >
                  {stage.label}
                </p>
                {stage.description && (
                  <p className="text-label-xs text-on-surface-variant mt-0.5 truncate">
                    {stage.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ErrorBanner: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ title = 'Failed to load data', message, onRetry, className }) => (
  <div
    role="alert"
    className={cn(
      'p-space-md rounded-xl bg-error-container/60 border border-error/30 text-error-on-container flex items-start justify-between gap-3',
      className
    )}
  >
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-error mt-0.5 flex-shrink-0" />
      <div>
        <h5 className="font-semibold text-body-sm text-error leading-snug">{title}</h5>
        <p className="text-label-xs opacity-90 mt-0.5">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button
        variant="destructive"
        size="sm"
        onClick={onRetry}
        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        className="flex-shrink-0"
      >
        Retry
      </Button>
    )}
  </div>
);
