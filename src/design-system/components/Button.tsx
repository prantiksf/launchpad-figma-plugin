import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant (SLDS 2 Cosmos) */
  variant?: 'base' | 'neutral' | 'brand' | 'brand-outline' | 'destructive' | 'destructive-text' | 'success';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to show before text */
  leftIcon?: React.ReactNode;
  /** Icon to show after text */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * Button Component (SLDS 2 Cosmos Theme)
 * 
 * Uses official Salesforce Lightning Design System 2 Cosmos styling.
 * Colors sourced from @salesforce-ux/sds-metadata package.
 * 
 * @example
 * <Button variant="brand">Save</Button>
 * <Button variant="neutral">Cancel</Button>
 * <Button variant="destructive">Delete</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'neutral',
      size = 'medium',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // SLDS 2 Cosmos base styles
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-full
      transition-all duration-150 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    // Size styles
    const sizeStyles = {
      small: 'px-3 py-1.5 text-xs',
      medium: 'px-4 py-2 text-sm',
      large: 'px-6 py-3 text-base',
    };

    // Variant styles (SLDS 2 Cosmos colors)
    const variantStyles = {
      // Base - text only, no background
      base: `
        text-[var(--slds-g-color-brand-base-50)] 
        hover:text-[var(--slds-g-color-brand-base-40)] 
        hover:underline
        focus:ring-[var(--slds-g-color-brand-base-50)]
      `,
      // Neutral - white, no border
      neutral: `
        bg-[var(--slds-g-color-neutral-base-95)] 
        text-[var(--slds-g-color-neutral-base-30)]
        border-0
        hover:bg-[var(--slds-g-color-neutral-base-90)]
        focus:ring-[var(--slds-g-color-brand-base-50)]
      `,
      // Brand - solid blue
      brand: `
        bg-[var(--slds-g-color-brand-base-50)] 
        text-white
        border-0
        hover:bg-[var(--slds-g-color-brand-base-40)]
        active:bg-[var(--slds-g-color-brand-base-30)]
        focus:ring-[var(--slds-g-color-brand-base-50)]
      `,
      // Brand Outline - blue border
      'brand-outline': `
        bg-transparent
        text-[var(--slds-g-color-brand-base-50)]
        border border-[var(--slds-g-color-brand-base-50)]
        hover:bg-[var(--slds-g-color-brand-base-90)]
        focus:ring-[var(--slds-g-color-brand-base-50)]
      `,
      // Destructive - solid pink
      destructive: `
        bg-[var(--slds-g-color-error-base-50)] 
        text-white
        border-0
        hover:bg-[var(--slds-g-color-error-base-40)]
        active:bg-[var(--slds-g-color-error-base-30)]
        focus:ring-[var(--slds-g-color-error-base-50)]
      `,
      // Destructive Text - pink text with border
      'destructive-text': `
        bg-transparent
        text-[var(--slds-g-color-error-base-50)]
        border border-[var(--slds-g-color-error-base-50)]
        hover:bg-[var(--slds-g-color-error-base-90)]
        focus:ring-[var(--slds-g-color-error-base-50)]
      `,
      // Success - solid teal
      success: `
        bg-[var(--slds-g-color-success-base-50)] 
        text-white
        border-0
        hover:bg-[var(--slds-g-color-success-base-40)]
        active:bg-[var(--slds-g-color-success-base-30)]
        focus:ring-[var(--slds-g-color-success-base-50)]
      `,
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        
        {children}
        
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Icon-only button variant (SLDS 2 Cosmos)
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /** Icon to display */
  icon: React.ReactNode;
  /** Accessible label */
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'medium', variant = 'neutral', className, ...props }, ref) => {
    const sizeStyles = {
      small: 'p-1.5',
      medium: 'p-2',
      large: 'p-3',
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={clsx(sizeStyles[size], 'rounded-full', className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
