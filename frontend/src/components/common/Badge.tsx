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
      'bg-[#DCFCE7] text-[#166534] font-semibold border border-[#86EFAC]',
    needs_checking:
      'bg-[#FEF3C7] text-[#92400E] font-semibold border border-[#FCD34D]',
    error:
      'bg-[#FEE2E2] text-[#991B1B] font-semibold border border-[#FCA5A5]',
    draft:
      'bg-[#DBE5DD] text-[#151D19] font-medium border border-[#BFC9C1]',
    category:
      'bg-[#DBE5DD] text-[#151D19] font-medium border border-[#BFC9C1]',
    neutral:
      'bg-surface-container text-on-surface-variant font-medium border border-outline',
    primary:
      'bg-[#1B5E3A] text-white font-semibold border border-[#1B5E3A]',
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
      {iconElement && <span className="flex-shrink-0 text-current">{iconElement}</span>}
      <span className="text-current">{children}</span>
    </span>
  );
};
