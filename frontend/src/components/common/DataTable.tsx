import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  title: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  tabular?: boolean;
  width?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onSelectId?: (id: string) => void;
  onSelectAll?: () => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching this criteria.',
  onRowClick,
  selectedIds,
  onSelectId,
  onSelectAll,
  sortColumn,
  sortDirection,
  onSort,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={6} cols={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon="receipt" />;
  }

  const allSelected = selectedIds && selectedIds.length === data.length && data.length > 0;

  return (
    <div
      className={cn(
        'w-full overflow-hidden bg-surface-container-lowest rounded-xl border border-outline shadow-card',
        className
      )}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-outline bg-surface-container-low/70">
              {onSelectAll && (
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded text-primary border-outline focus:ring-primary cursor-pointer"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                    className={cn(
                      'px-4 py-3 text-label-xs font-semibold text-on-surface-variant uppercase tracking-wider select-none',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable && 'cursor-pointer hover:text-on-surface'
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'justify-end w-full',
                        col.align === 'center' && 'justify-center w-full'
                      )}
                    >
                      <span>{col.title}</span>
                      {col.sortable && (
                        isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-on-surface-variant/60" />
                        )
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-outline/60">
            {data.map((item, index) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds?.includes(id);

              return (
                <tr
                  key={id}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    'transition-colors duration-100 group',
                    onRowClick && 'cursor-pointer',
                    isSelected
                      ? 'bg-primary-fixed/20'
                      : 'hover:bg-surface-container-low/80 dark:hover:bg-surface-container/60'
                  )}
                >
                  {onSelectId && (
                    <td
                      className="w-10 px-4 py-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectId(id)}
                        className="w-4 h-4 rounded text-primary border-outline focus:ring-primary cursor-pointer"
                        aria-label={`Select row ${id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => {
                    const rawVal = (item as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3.5 text-body-sm text-on-surface',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.tabular && 'tabular-nums font-medium'
                        )}
                      >
                        {col.render ? col.render(item, index) : rawVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
