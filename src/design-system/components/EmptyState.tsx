import React from 'react';
import { clsx } from 'clsx';
import { Inbox, Search, FileX, AlertCircle } from 'lucide-react';

export interface EmptyStateProps {
  /** Icon or illustration */
  icon?: React.ReactNode;
  /** Preset icon type */
  type?: 'empty' | 'search' | 'error' | 'no-data';
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Action button(s) */
  action?: React.ReactNode;
  /** Size */
  size?: 'small' | 'medium' | 'large';
  /** Additional className */
  className?: string;
}

/**
 * Empty State Component (SLDS 2 Cosmos Theme)
 * 
 * Display when there's no content to show.
 * 
 * @example
 * <EmptyState
 *   type="empty"
 *   title="No items yet"
 *   description="Get started by creating your first item."
 *   action={<Button variant="brand">Create Item</Button>}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  type = 'empty',
  title,
  description,
  action,
  size = 'medium',
  className,
}) => {
  const presetIcons = {
    empty: Inbox,
    search: Search,
    error: AlertCircle,
    'no-data': FileX,
  };

  const sizeStyles = {
    small: {
      container: 'py-6 px-4',
      icon: 'w-10 h-10',
      title: 'text-sm',
      description: 'text-xs',
    },
    medium: {
      container: 'py-10 px-6',
      icon: 'w-14 h-14',
      title: 'text-base',
      description: 'text-sm',
    },
    large: {
      container: 'py-16 px-8',
      icon: 'w-20 h-20',
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const Icon = icon ? null : presetIcons[type];
  const styles = sizeStyles[size];

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      {icon ? (
        <div className={clsx('mb-4 text-[var(--slds-g-color-neutral-base-70)]', styles.icon)}>
          {icon}
        </div>
      ) : Icon && (
        <Icon
          className={clsx(
            'mb-4 text-[var(--slds-g-color-neutral-base-70)]',
            styles.icon
          )}
          strokeWidth={1.5}
        />
      )}
      
      <h3
        className={clsx(
          'font-semibold text-[var(--slds-g-color-neutral-base-30)]',
          styles.title
        )}
      >
        {title}
      </h3>
      
      {description && (
        <p
          className={clsx(
            'mt-1 text-[var(--slds-g-color-neutral-base-60)] max-w-sm',
            styles.description
          )}
        >
          {description}
        </p>
      )}
      
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';


