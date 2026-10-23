import React from 'react';
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'elevated' | 'amber' | 'emerald';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-surface-container-lowest border border-outline rounded-xl shadow-card transition-shadow hover:shadow-elevated',
      flat: 'bg-surface-container-low border border-outline rounded-xl',
      elevated:
        'bg-surface-container-lowest border border-outline/80 rounded-xl shadow-elevated',
      amber:
        'bg-tertiary-fixed/40 border border-tertiary-fixed-dim rounded-xl text-tertiary-on-fixed shadow-sm',
      emerald:
        'bg-verified-container/40 border border-verified-border rounded-xl text-verified-on-container shadow-sm',
    };

    return (
      <div ref={ref} className={cn(variants[variant], 'p-space-md', className)} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<{
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={cn('flex items-start justify-between gap-3 mb-space-sm pb-space-xs', className)}>
    <div>
      <h3 className="font-headline-sm text-headline-sm text-on-surface leading-snug">{title}</h3>
      {subtitle && (
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export interface MetricCardProps {
  label: string;
  value: string | number;
  isCurrency?: boolean;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  isCurrency = false,
  trend,
  subtitle,
  icon,
  badge,
  onClick,
  className,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'p-space-md bg-surface-container-lowest rounded-xl border border-outline shadow-card flex flex-col justify-between transition-all duration-150',
      onClick && 'cursor-pointer hover:border-outline-variant hover:shadow-elevated active:scale-[0.99]',
      className
    )}
  >
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="font-label-xs text-label-xs font-semibold text-on-surface-variant uppercase tracking-wider truncate">
        {label}
      </span>
      {badge || (icon && <span className="text-on-surface-variant p-1 rounded-md">{icon}</span>)}
    </div>

    <div className="my-1">
      <div className="font-currency-stat text-currency-stat text-on-surface tabular-nums tracking-tight font-bold">
        {isCurrency && typeof value === 'number'
          ? `₹${value.toLocaleString('en-IN')}`
          : value}
      </div>
    </div>

    {(trend || subtitle) && (
      <div className="mt-2 flex items-center gap-2 text-label-xs">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded',
              trend.isPositive
                ? 'text-verified bg-verified-container/70'
                : 'text-error bg-error-container/70'
            )}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {trend.value}
          </span>
        )}
        {subtitle && (
          <span className="text-on-surface-variant truncate font-normal">{subtitle}</span>
        )}
      </div>
    )}
  </div>
);

export const ReviewAlertCard: React.FC<{
  title: string;
  description: string;
  count?: number;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  title,
  description,
  count,
  actionText = 'Review Now',
  onAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-space-md rounded-xl bg-tertiary-fixed/40 border border-tertiary-fixed-dim text-tertiary-on-fixed shadow-sm',
      className
    )}
  >
    <div className="flex items-start gap-3">
      <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary mt-0.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-headline-sm text-body-lg font-bold text-on-surface">{title}</h4>
          {count !== undefined && (
            <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-tertiary text-on-tertiary">
              {count}
            </span>
          )}
        </div>
        <p className="text-body-sm text-on-surface-variant mt-0.5">{description}</p>
      </div>
    </div>
    {onAction && (
      <button
        onClick={onAction}
        className="w-full sm:w-auto px-4 py-2 bg-tertiary text-white rounded-lg text-label-md font-semibold hover:bg-amber-700 transition-colors shadow-sm flex-shrink-0"
      >
        {actionText}
      </button>
    )}
  </div>
);
