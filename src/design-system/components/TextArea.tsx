import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle } from 'lucide-react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label for the textarea */
  label?: string;
  /** Required indicator */
  required?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Helper text */
  helperText?: string;
  /** Show character count */
  showCount?: boolean;
  /** Max character count */
  maxLength?: number;
  /** Resize behavior */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

/**
 * TextArea Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <TextArea label="Description" placeholder="Enter description..." />
 * <TextArea label="Notes" showCount maxLength={500} />
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      required = false,
      error = false,
      errorMessage,
      helperText,
      showCount = false,
      maxLength,
      resize = 'vertical',
      disabled,
      className,
      id,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${React.useId()}`;
    const charCount = typeof value === 'string' ? value.length : 0;

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={clsx(
              'block mb-1.5 text-sm font-medium',
              'text-[var(--slds-g-color-neutral-base-30)]',
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && <span className="text-[var(--slds-g-color-error-base-50)] ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            aria-invalid={error}
            value={value}
            maxLength={maxLength}
            className={clsx(
              'w-full min-h-[100px] px-3 py-2',
              'rounded-lg border',
              'bg-[var(--slds-g-color-neutral-base-100)]',
              'text-sm',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              resizeStyles[resize],
              error
                ? [
                    'border-[var(--slds-g-color-error-base-50)]',
                    'focus:ring-[var(--slds-g-color-error-base-50)]/30',
                    'focus:border-[var(--slds-g-color-error-base-50)]',
                  ]
                : [
                    'border-[var(--slds-g-color-neutral-base-80)]',
                    'focus:ring-[var(--slds-g-color-brand-base-50)]/30',
                    'focus:border-[var(--slds-g-color-brand-base-50)]',
                  ],
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--slds-g-color-neutral-base-95)]',
              className
            )}
            {...props}
          />

          {error && (
            <div className="absolute right-3 top-3 text-[var(--slds-g-color-error-base-50)]">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex justify-between mt-1.5">
          <div>
            {error && errorMessage && (
              <p className="text-xs text-[var(--slds-g-color-error-base-50)]">{errorMessage}</p>
            )}
            {!error && helperText && (
              <p className="text-xs text-[var(--slds-g-color-neutral-base-60)]">{helperText}</p>
            )}
          </div>

          {showCount && (
            <p
              className={clsx(
                'text-xs',
                maxLength && charCount >= maxLength
                  ? 'text-[var(--slds-g-color-error-base-50)]'
                  : 'text-[var(--slds-g-color-neutral-base-60)]'
              )}
            >
              {charCount}
              {maxLength && `/${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
