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
        'bg-[#1B5E3A] text-white hover:bg-[#14492D] shadow-card hover:shadow-elevated active:bg-[#0F3822]',
      secondary:
        'bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high hover:border-outline-variant shadow-sm',
      destructive:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm active:bg-[#991B1B]',
      outline:
        'border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-low hover:border-outline-variant',
      ghost:
        'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
      amber:
        'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] hover:bg-[#FDE68A] shadow-sm',
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
          leftIcon && <span className="flex-shrink-0 text-current">{leftIcon}</span>
        )}
        {children && <span className="text-current">{children}</span>}
        {!isLoading && rightIcon && <span className="flex-shrink-0 text-current">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
