import React from 'react';
import { clsx } from 'clsx';

export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Border radius */
  radius?: 'none' | 'small' | 'medium' | 'large';
  /** Shadow depth */
  shadow?: 'none' | 'small' | 'medium' | 'large';
  /** Border style */
  bordered?: boolean;
  /** Hover effect */
  hoverable?: boolean;
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Card Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Card>
 *   <CardHeader>Title</CardHeader>
 *   <CardContent>Content</CardContent>
 * </Card>
 */
export const Card: React.FC<CardProps> = ({
  children,
  padding = 'medium',
  radius = 'medium',
  shadow = 'small',
  bordered = true,
  hoverable = false,
  onClick,
  className,
}) => {
  const paddingStyles = {
    none: '',
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  const radiusStyles = {
    none: '',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-xl',
  };

  const shadowStyles = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'bg-[var(--slds-g-color-neutral-base-100)]',
        paddingStyles[padding],
        radiusStyles[radius],
        shadowStyles[shadow],
        bordered && 'border border-[var(--slds-g-color-neutral-base-90)]',
        hoverable && 'transition-all duration-200 hover:shadow-md hover:border-[var(--slds-g-color-neutral-base-80)]',
        onClick && 'cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-[var(--slds-g-color-brand-base-50)]/30',
        className
      )}
    >
      {children}
    </Component>
  );
};

Card.displayName = 'Card';

export interface CardHeaderProps {
  children: React.ReactNode;
  /** Action buttons/elements */
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  action,
  className,
}) => {
  return (
    <div className={clsx('flex items-center justify-between mb-3', className)}>
      <h3 className="font-semibold text-[var(--slds-g-color-neutral-base-20)]">
        {children}
      </h3>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

CardHeader.displayName = 'CardHeader';

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={clsx('text-sm text-[var(--slds-g-color-neutral-base-40)]', className)}>
      {children}
    </div>
  );
};

CardContent.displayName = 'CardContent';

export interface CardFooterProps {
  children: React.ReactNode;
  /** Alignment */
  align?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  align = 'right',
  className,
}) => {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={clsx('flex items-center gap-2 mt-4 pt-0', alignStyles[align], className)}>
      {children}
    </div>
  );
};

CardFooter.displayName = 'CardFooter';


