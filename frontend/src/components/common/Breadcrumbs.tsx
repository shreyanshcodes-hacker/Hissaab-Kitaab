import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHome = true,
  className,
}) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-body-sm', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="inline-flex items-center">
            <span className="text-on-surface-variant/80 hover:text-on-surface transition-colors flex items-center">
              <Home className="w-4 h-4" />
            </span>
            <ChevronRight className="w-3.5 h-3.5 mx-1 text-on-surface-variant/50 flex-shrink-0" />
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center">
              {isLast ? (
                <span
                  className="font-semibold text-on-surface truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.onClick || item.href ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="text-on-surface-variant hover:text-on-surface hover:underline truncate max-w-[150px] transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-on-surface-variant truncate max-w-[150px]">{item.label}</span>
              )}

              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-on-surface-variant/50 flex-shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
