import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, Search } from 'lucide-react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Label for the input */
  label?: string;
  /** Required indicator */
  required?: boolean;
  /** Helper text below input */
  helperText?: string;
  /** Icon to show at the start */
  leftIcon?: React.ReactNode;
  /** Icon to show at the end */
  rightIcon?: React.ReactNode;
}

/**
 * Input Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Input label="Account Name" placeholder="Enter account name" />
 * <Input error errorMessage="This field is required" />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'medium',
      error = false,
      errorMessage,
      label,
      required = false,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${React.useId()}`;

    const sizeStyles = {
      small: 'h-8 text-xs px-3',
      medium: 'h-10 text-sm px-3',
      large: 'h-12 text-base px-4',
    };

    const labelSizes = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className={clsx(
              'block mb-1.5 font-medium',
              labelSizes[size],
              'text-[var(--slds-g-color-neutral-base-30)]',
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && <span className="text-[var(--slds-g-color-error-base-50)] ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slds-g-color-neutral-base-60)]">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={error && errorMessage ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={clsx(
              'w-full rounded-lg border bg-[var(--slds-g-color-neutral-base-100)]',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              sizeStyles[size],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error ? [
                'border-[var(--slds-g-color-error-base-50)]',
                'focus:ring-[var(--slds-g-color-error-base-50)]/30',
                'focus:border-[var(--slds-g-color-error-base-50)]',
              ] : [
                'border-[var(--slds-g-color-neutral-base-80)]',
                'focus:ring-[var(--slds-g-color-brand-base-50)]/30',
                'focus:border-[var(--slds-g-color-brand-base-50)]',
              ],
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--slds-g-color-neutral-base-95)]',
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--slds-g-color-neutral-base-60)]">
              {rightIcon}
            </div>
          )}
          
          {error && !rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--slds-g-color-error-base-50)]">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>
        
        {error && errorMessage && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-[var(--slds-g-color-error-base-50)] flex items-center gap-1">
            {errorMessage}
          </p>
        )}
        
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-[var(--slds-g-color-neutral-base-60)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Search Input variant
 */
export const SearchInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'leftIcon'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        leftIcon={<Search className="w-4 h-4" />}
        placeholder="Search..."
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
