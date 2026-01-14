import React from 'react';
import { clsx } from 'clsx';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  /** Group name for radio inputs */
  name: string;
  /** Array of options */
  options: RadioOption[];
  /** Currently selected value */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Label for the group */
  label?: string;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * RadioGroup Component (SLDS 2 Cosmos Theme)
 * Simple radio button group matching the SLDS design specification
 * 
 * @example
 * <RadioGroup
 *   name="type"
 *   options={[
 *     { value: 'cover', label: 'Cover Page' },
 *     { value: 'component', label: 'Component' },
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 * />
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  direction = 'horizontal',
  disabled = false,
  className,
}) => {
  const containerStyles = clsx(
    'slds-form-element__control',
    className
  );

  const optionContainerStyles = clsx(
    'flex',
    direction === 'horizontal' ? 'flex-row gap-6' : 'flex-col gap-2'
  );

  return (
    <fieldset className="slds-form-element">
      {label && (
        <legend className="slds-form-element__legend slds-form-element__label">
          {label}
        </legend>
      )}
      <div className={containerStyles}>
        <div className={optionContainerStyles}>
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <label
                key={option.value}
                className={clsx(
                  'slds-radio-item',
                  disabled && 'slds-radio-disabled'
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => !disabled && onChange(option.value)}
                  disabled={disabled}
                  className="sr-only"
                />
                <span className={clsx(
                  'slds-radio-faux',
                  isSelected && 'slds-radio-faux--selected'
                )} />
                <span className="slds-radio-label">{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
};

RadioGroup.displayName = 'RadioGroup';
