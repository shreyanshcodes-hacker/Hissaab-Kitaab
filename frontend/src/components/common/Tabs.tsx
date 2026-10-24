import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pill' | 'segmented';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}) => {
  if (variant === 'segmented' || variant === 'pill') {
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex items-center p-1 bg-surface-container rounded-xl border border-outline/60 max-w-full overflow-x-auto',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all duration-150 select-none whitespace-nowrap flex-shrink-0',
                isActive
                  ? 'bg-surface-container-lowest text-on-surface shadow-card'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-label-xs font-bold tabular-nums',
                    isActive
                      ? 'bg-[#1B5E3A] text-white'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline variant
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-6 border-b border-outline overflow-x-auto', className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative py-3 flex items-center gap-2 text-label-md font-semibold transition-colors duration-150 select-none whitespace-nowrap',
              isActive
                ? 'text-primary border-b-2 border-primary -mb-[1px]'
                : 'text-on-surface-variant hover:text-on-surface',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-label-xs font-bold tabular-nums',
                  isActive
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
