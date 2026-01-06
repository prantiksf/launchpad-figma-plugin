import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Color variant */
  variant?: 'default' | 'brand' | 'inverse';
  /** Label for accessibility */
  label?: string;
  /** Additional className */
  className?: string;
}

/**
 * Spinner Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Spinner />
 * <Spinner size="large" variant="brand" />
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  variant = 'default',
  label = 'Loading',
  className,
}) => {
  const sizeStyles = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-10 h-10',
  };

  const variantStyles = {
    default: 'text-[var(--slds-g-color-neutral-base-60)]',
    brand: 'text-[var(--slds-g-color-brand-base-50)]',
    inverse: 'text-white',
  };

  return (
    <div
      role="status"
      aria-label={label}
      className={clsx('inline-flex', className)}
    >
      <Loader2
        className={clsx(
          'animate-spin',
          sizeStyles[size],
          variantStyles[variant]
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

Spinner.displayName = 'Spinner';

/**
 * Full page/container loading overlay
 */
export interface LoadingOverlayProps {
  /** Show the overlay */
  visible?: boolean;
  /** Loading text */
  label?: string;
  /** Spinner size */
  size?: SpinnerProps['size'];
  /** Background style */
  backdrop?: 'transparent' | 'light' | 'dark';
  /** Additional className */
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible = true,
  label = 'Loading...',
  size = 'large',
  backdrop = 'light',
  className,
}) => {
  if (!visible) return null;

  const backdropStyles = {
    transparent: 'bg-transparent',
    light: 'bg-[var(--slds-g-color-neutral-base-100)]/80',
    dark: 'bg-[var(--slds-g-color-neutral-base-20)]/80',
  };

  return (
    <div
      className={clsx(
        'absolute inset-0 flex flex-col items-center justify-center z-50',
        backdropStyles[backdrop],
        className
      )}
    >
      <Spinner
        size={size}
        variant={backdrop === 'dark' ? 'inverse' : 'brand'}
      />
      {label && (
        <p
          className={clsx(
            'mt-3 text-sm font-medium',
            backdrop === 'dark'
              ? 'text-white'
              : 'text-[var(--slds-g-color-neutral-base-40)]'
          )}
        >
          {label}
        </p>
      )}
    </div>
  );
};

LoadingOverlay.displayName = 'LoadingOverlay';
