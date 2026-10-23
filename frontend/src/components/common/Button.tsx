import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'amber';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-label-md rounded-lg transition-all duration-150 focus-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variants = {
      primary:
        'bg-primary-container text-on-primary hover:bg-primary shadow-card hover:shadow-elevated active:bg-primary-hover',
      secondary:
        'bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high hover:border-outline-variant shadow-sm',
      destructive:
        'bg-error text-on-error hover:bg-red-700 shadow-sm active:bg-red-800',
      outline:
        'border border-outline bg-transparent text-on-surface hover:bg-surface-container-low hover:border-outline-variant',
      ghost:
        'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
      amber:
        'bg-tertiary-fixed text-tertiary-on-fixed border border-tertiary-fixed-dim hover:bg-amber-100 shadow-sm',
    };

    const sizes = {
      sm: 'h-8 px-3 text-label-xs gap-1.5',
      md: 'h-10 px-4 text-label-md gap-2',
      lg: 'h-12 px-5 text-base gap-2.5',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
