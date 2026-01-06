import React from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant (SLDS 2 Cosmos) */
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error' | 'inverse';
  /** Size */
  size?: 'small' | 'medium' | 'large';
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Show remove button */
  removable?: boolean;
  /** Called when remove button is clicked */
  onRemove?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Badge Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="error">Failed</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  removable = false,
  onRemove,
  className,
}) => {
  const sizeStyles = {
    small: 'text-xs px-2 py-0.5 gap-1',
    medium: 'text-xs px-2.5 py-1 gap-1.5',
    large: 'text-sm px-3 py-1.5 gap-2',
  };

  const variantStyles = {
    default: `
      bg-[var(--slds-g-color-neutral-base-90)]
      text-[var(--slds-g-color-neutral-base-30)]
    `,
    brand: `
      bg-[var(--slds-g-color-brand-base-80)]
      text-[var(--slds-g-color-brand-base-30)]
    `,
    success: `
      bg-[var(--slds-g-color-success-base-80)]
      text-[var(--slds-g-color-success-base-30)]
    `,
    warning: `
      bg-[var(--slds-g-color-warning-base-80)]
      text-[var(--slds-g-color-warning-base-30)]
    `,
    error: `
      bg-[var(--slds-g-color-error-base-80)]
      text-[var(--slds-g-color-error-base-30)]
    `,
    inverse: `
      bg-[var(--slds-g-color-neutral-base-20)]
      text-[var(--slds-g-color-neutral-base-95)]
    `,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

Badge.displayName = 'Badge';

/**
 * Status Badge with dot indicator
 */
export interface StatusBadgeProps {
  /** Status text */
  children: React.ReactNode;
  /** Status type */
  status: 'online' | 'offline' | 'busy' | 'away';
  /** Size */
  size?: 'small' | 'medium';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  status,
  size = 'medium',
  className,
}) => {
  const statusColors = {
    online: 'bg-[var(--slds-g-color-success-base-50)]',
    offline: 'bg-[var(--slds-g-color-neutral-base-60)]',
    busy: 'bg-[var(--slds-g-color-error-base-50)]',
    away: 'bg-[var(--slds-g-color-warning-base-50)]',
  };

  const sizeStyles = {
    small: 'text-xs gap-1.5',
    medium: 'text-sm gap-2',
  };

  const dotSizes = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
  };

  return (
    <span className={clsx('inline-flex items-center', sizeStyles[size], className)}>
      <span className={clsx('rounded-full', dotSizes[size], statusColors[status])} />
      <span className="text-[var(--slds-g-color-neutral-base-40)]">{children}</span>
    </span>
  );
};

StatusBadge.displayName = 'StatusBadge';
