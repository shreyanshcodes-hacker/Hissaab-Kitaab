import React from 'react';
import { Search, Calendar, X } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { Dropdown } from './Dropdown';
import { cn } from '../../utils/cn';

export interface FilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  dateRangeLabel?: string;
  dateRangeOptions?: { id: string; label: string; onClick: () => void }[];
  filters?: React.ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search receipts, items, bahi khata...',
  dateRangeLabel = 'October 2024',
  dateRangeOptions,
  filters,
  activeFilterCount = 0,
  onClearFilters,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-space-sm bg-surface-container-lowest rounded-xl border border-outline shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm',
        className
      )}
    >
      {/* Search Input */}
      <div className="flex-1 min-w-[240px]">
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder={searchPlaceholder}
          leftIcon={<Search className="w-4 h-4" />}
          className="h-9 bg-surface-container-low border-transparent focus:bg-surface-container-lowest"
        />
      </div>

      {/* Filter Slots & Date Range */}
      <div className="flex items-center gap-space-sm flex-wrap">
        {filters}

        {/* Date Selector */}
        {dateRangeOptions && (
          <Dropdown
            trigger={
              <button className="h-9 px-3 bg-surface-container-low hover:bg-surface-container rounded-lg border border-outline/70 text-on-surface font-label-md text-label-xs flex items-center gap-1.5 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                <span>{dateRangeLabel}</span>
              </button>
            }
            items={dateRangeOptions.map((opt) => ({
              id: opt.id,
              label: opt.label,
              onClick: opt.onClick,
            }))}
            align="right"
          />
        )}

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            leftIcon={<X className="w-3.5 h-3.5" />}
            className="text-label-xs h-9 text-on-surface-variant"
          >
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
};
