import React from 'react';
import { clsx } from 'clsx';

export interface DividerProps {
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Label in the middle */
  label?: string;
  /** Additional className */
  className?: string;
}

/**
 * Divider Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Divider />
 * <Divider label="OR" />
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className,
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        className={clsx(
          'w-px self-stretch bg-[var(--slds-g-color-neutral-base-90)]',
          className
        )}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div
        className={clsx('flex items-center gap-4', className)}
        role="separator"
      >
        <div className="flex-1 h-px bg-[var(--slds-g-color-neutral-base-90)]" />
        <span className="text-xs font-medium text-[var(--slds-g-color-neutral-base-60)] uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-[var(--slds-g-color-neutral-base-90)]" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'h-px w-full bg-[var(--slds-g-color-neutral-base-90)]',
        className
      )}
      role="separator"
      aria-orientation="horizontal"
    />
  );
};

Divider.displayName = 'Divider';


