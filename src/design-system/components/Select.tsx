import React from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Options to display */
  options: SelectOption[];
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Label for the select */
  label?: string;
  /** Required indicator */
  required?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Helper text */
  helperText?: string;
  /** Placeholder option */
  placeholder?: string;
}

/**
 * Select Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Select 
 *   label="Status"
 *   options={[
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' },
 *   ]}
 * />
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      size = 'medium',
      label,
      required = false,
      error = false,
      errorMessage,
      helperText,
      placeholder,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${React.useId()}`;

    const sizeStyles = {
      small: 'h-8 text-xs px-3 pr-8',
      medium: 'h-10 text-sm px-3 pr-10',
      large: 'h-12 text-base px-4 pr-12',
    };

    const labelSizes = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    const iconSizes = {
      small: 'w-3 h-3 right-2',
      medium: 'w-4 h-4 right-3',
      large: 'w-5 h-5 right-4',
    };

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
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
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error}
            className={clsx(
              'w-full rounded-lg border appearance-none cursor-pointer',
              'bg-[var(--slds-g-color-neutral-base-100)]',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              sizeStyles[size],
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          
          <ChevronDown 
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none',
              'text-[var(--slds-g-color-neutral-base-60)]',
              iconSizes[size]
            )} 
          />
        </div>
        
        {error && errorMessage && (
          <p className="mt-1.5 text-xs text-[var(--slds-g-color-error-base-50)]">
            {errorMessage}
          </p>
        )}
        
        {!error && helperText && (
          <p className="mt-1.5 text-xs text-[var(--slds-g-color-neutral-base-60)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
