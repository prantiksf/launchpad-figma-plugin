import React from 'react';
import { clsx } from 'clsx';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Label text */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Indeterminate state (partially checked) */
  indeterminate?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
}

/**
 * Checkbox Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Checkbox label="Accept terms and conditions" />
 * <Checkbox label="Select all" indeterminate />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      size = 'medium',
      label,
      helperText,
      indeterminate = false,
      error = false,
      errorMessage,
      disabled,
      className,
      id,
      checked,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${React.useId()}`;
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const boxSizes = {
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-6 h-6',
    };

    const iconSizes = {
      small: 'w-3 h-3',
      medium: 'w-3.5 h-3.5',
      large: 'w-4 h-4',
    };

    const labelSizes = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    return (
      <div className={clsx('flex flex-col gap-1', className)}>
        <label
          htmlFor={checkboxId}
          className={clsx(
            'inline-flex items-start gap-3 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={inputRef}
              id={checkboxId}
              type="checkbox"
              disabled={disabled}
              checked={checked}
              className="peer sr-only"
              {...props}
            />
            <div
              className={clsx(
                'rounded-md border-2 transition-all duration-150',
                boxSizes[size],
                'flex items-center justify-center',
                error
                  ? 'border-[var(--slds-g-color-error-base-50)]'
                  : 'border-[var(--slds-g-color-neutral-base-70)]',
                'peer-checked:bg-[var(--slds-g-color-brand-base-50)]',
                'peer-checked:border-[var(--slds-g-color-brand-base-50)]',
                'peer-indeterminate:bg-[var(--slds-g-color-brand-base-50)]',
                'peer-indeterminate:border-[var(--slds-g-color-brand-base-50)]',
                'peer-focus:ring-2 peer-focus:ring-[var(--slds-g-color-brand-base-50)]/30',
                disabled && 'opacity-50'
              )}
            >
              {(checked || indeterminate) && (
                indeterminate ? (
                  <Minus className={clsx(iconSizes[size], 'text-white')} strokeWidth={3} />
                ) : (
                  <Check className={clsx(iconSizes[size], 'text-white')} strokeWidth={3} />
                )
              )}
            </div>
          </div>
          
          {label && (
            <div className="flex flex-col">
              <span className={clsx(
                labelSizes[size],
                'text-[var(--slds-g-color-neutral-base-30)]',
                disabled && 'opacity-50'
              )}>
                {label}
              </span>
              {helperText && !error && (
                <span className="text-xs text-[var(--slds-g-color-neutral-base-60)]">
                  {helperText}
                </span>
              )}
              {error && errorMessage && (
                <span className="text-xs text-[var(--slds-g-color-error-base-50)]">
                  {errorMessage}
                </span>
              )}
            </div>
          )}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

/**
 * Checkbox Group for multiple options
 */
export interface CheckboxGroupProps {
  /** Group label */
  label?: string;
  /** Options */
  options: { value: string; label: string; disabled?: boolean }[];
  /** Selected values */
  value: string[];
  /** Change handler */
  onChange: (value: string[]) => void;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  value,
  onChange,
  orientation = 'vertical',
  size = 'medium',
  disabled,
}) => {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <fieldset className="space-y-2">
      {label && (
        <legend className="text-sm font-medium text-[var(--slds-g-color-neutral-base-30)] mb-2">
          {label}
        </legend>
      )}
      <div className={clsx(
        'flex gap-3',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
      )}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            size={size}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
          />
        ))}
      </div>
    </fieldset>
  );
};

CheckboxGroup.displayName = 'CheckboxGroup';
