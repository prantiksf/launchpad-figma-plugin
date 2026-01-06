import React from 'react';
import { clsx } from 'clsx';

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Label text */
  label?: string;
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** Helper text */
  helperText?: string;
}

/**
 * Toggle/Switch Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Toggle label="Enable notifications" />
 * <Toggle label="Dark mode" checked />
 */
export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      size = 'medium',
      label,
      labelPosition = 'right',
      helperText,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const toggleId = id || `toggle-${React.useId()}`;

    const trackSizes = {
      small: 'w-8 h-4',
      medium: 'w-11 h-6',
      large: 'w-14 h-8',
    };

    const thumbSizes = {
      small: 'w-3 h-3',
      medium: 'w-5 h-5',
      large: 'w-7 h-7',
    };

    const thumbTranslate = {
      small: 'peer-checked:translate-x-4',
      medium: 'peer-checked:translate-x-5',
      large: 'peer-checked:translate-x-6',
    };

    const labelSizes = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    const toggle = (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          id={toggleId}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={clsx(
            'rounded-full transition-colors duration-200 cursor-pointer',
            trackSizes[size],
            'bg-[var(--slds-g-color-neutral-base-80)]',
            'peer-checked:bg-[var(--slds-g-color-brand-base-50)]',
            'peer-focus:ring-2 peer-focus:ring-[var(--slds-g-color-brand-base-50)]/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        <div
          className={clsx(
            'absolute left-0.5 top-1/2 -translate-y-1/2',
            'rounded-full bg-white shadow-sm',
            'transition-transform duration-200',
            thumbSizes[size],
            thumbTranslate[size],
            'pointer-events-none'
          )}
        />
      </div>
    );

    if (!label) {
      return toggle;
    }

    return (
      <div className={clsx('flex flex-col gap-1', className)}>
        <label
          htmlFor={toggleId}
          className={clsx(
            'inline-flex items-center gap-3 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
        >
          {labelPosition === 'left' && (
            <span className={clsx(
              labelSizes[size],
              'text-[var(--slds-g-color-neutral-base-30)]',
              disabled && 'opacity-50'
            )}>
              {label}
            </span>
          )}
          
          {toggle}
          
          {labelPosition === 'right' && (
            <span className={clsx(
              labelSizes[size],
              'text-[var(--slds-g-color-neutral-base-30)]',
              disabled && 'opacity-50'
            )}>
              {label}
            </span>
          )}
        </label>
        
        {helperText && (
          <span className="text-xs text-[var(--slds-g-color-neutral-base-60)] ml-14">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';
