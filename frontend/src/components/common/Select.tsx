import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-label-xs font-semibold text-on-surface-variant flex items-center justify-between"
          >
            <span>{label}</span>
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full h-10 pl-3.5 pr-10 bg-surface-container-lowest text-on-surface text-body-sm rounded-lg border border-outline appearance-none transition-all duration-150 outline-none cursor-pointer',
              'hover:border-outline-variant focus:border-primary-container focus:ring-2 focus:ring-primary-container/20',
              'disabled:bg-surface-container-low disabled:text-on-surface-variant/40 disabled:cursor-not-allowed',
              error && 'border-error focus:border-error focus:ring-error/20',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <span className="absolute right-3 text-on-surface-variant pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>

        {error ? (
          <p className="text-label-xs text-error font-medium leading-none">{error}</p>
        ) : helperText ? (
          <p className="text-label-xs text-on-surface-variant/80 leading-none">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
