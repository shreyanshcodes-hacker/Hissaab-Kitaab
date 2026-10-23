import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'verified'
  | 'needs_checking'
  | 'error'
  | 'draft'
  | 'neutral'
  | 'category'
  | 'primary';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  icon?: boolean | React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  icon = false,
  className,
  ...props
}) => {
  const variants = {
    verified:
      'bg-verified-container text-verified font-semibold border border-verified-border',
    needs_checking:
      'bg-tertiary-fixed text-tertiary-on-fixed font-semibold border border-tertiary-fixed-dim',
    error:
      'bg-error-container text-error font-semibold border border-error/20',
    draft:
      'bg-secondary-container text-secondary-on-container font-medium border border-secondary-container',
    category:
      'bg-secondary-fixed text-secondary-on-fixed-variant font-medium border border-outline/50',
    neutral:
      'bg-surface-container text-on-surface-variant font-medium border border-outline',
    primary:
      'bg-primary-container text-on-primary font-semibold border border-primary-container',
  };

  const sizes = {
    xs: 'text-[0.6875rem] px-2 py-0.5 rounded-full gap-1',
    sm: 'text-label-xs px-2.5 py-0.5 rounded-full gap-1.5',
    md: 'text-label-md px-3 py-1 rounded-full gap-2',
  };

  const defaultIcons = {
    verified: <CheckCircle2 className="w-3.5 h-3.5" />,
    needs_checking: <AlertTriangle className="w-3.5 h-3.5" />,
    error: <AlertCircle className="w-3.5 h-3.5" />,
    draft: <Clock className="w-3.5 h-3.5" />,
    category: null,
    neutral: null,
    primary: null,
  };

  const iconElement =
    typeof icon === 'boolean'
      ? icon
        ? defaultIcons[variant]
        : null
      : icon;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center leading-none select-none tracking-wide transition-colors whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {iconElement && <span className="flex-shrink-0">{iconElement}</span>}
      <span>{children}</span>
    </span>
  );
};
