import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isCurrency?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isCurrency = false,
      disabled,
      id,
      value,
      onChange,
      onClear,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label-xs font-semibold text-on-surface-variant flex items-center justify-between"
          >
            <span>{label}</span>
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {/* Left Currency / Icon */}
          {isCurrency ? (
            <span className="absolute left-3.5 text-on-surface-variant font-bold text-body-sm select-none">
              ₹
            </span>
          ) : (
            leftIcon && (
              <span className="absolute left-3.5 text-on-surface-variant flex items-center pointer-events-none">
                {leftIcon}
              </span>
            )
          )}

          <input
            ref={ref}
            id={inputId}
            type={computedType}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              'w-full h-10 px-3.5 bg-surface-container-lowest text-on-surface text-body-sm rounded-lg border border-outline placeholder:text-on-surface-variant/60 transition-all duration-150 outline-none',
              'hover:border-outline-variant focus:border-primary-container focus:ring-2 focus:ring-primary-container/20',
              'disabled:bg-surface-container-low disabled:text-on-surface-variant/40 disabled:cursor-not-allowed',
              isCurrency && 'pl-8 tabular-nums',
              !isCurrency && leftIcon && 'pl-10',
              (rightIcon || isPassword || (type === 'search' && value)) && 'pr-10',
              error && 'border-error focus:border-error focus:ring-error/20',
              className
            )}
            {...props}
          />

          {/* Right Icon / Password toggle / Search Clear */}
          {isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : type === 'search' && value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            rightIcon && (
              <span className="absolute right-3 text-on-surface-variant flex items-center pointer-events-none">
                {rightIcon}
              </span>
            )
          )}
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

Input.displayName = 'Input';
