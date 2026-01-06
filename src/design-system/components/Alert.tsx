import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  /** Alert message */
  children: React.ReactNode;
  /** Alert type */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Alert title */
  title?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Dismissible */
  dismissible?: boolean;
  /** Called when dismissed */
  onDismiss?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Alert Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Alert variant="success" title="Success">Your changes have been saved.</Alert>
 * <Alert variant="error">Something went wrong.</Alert>
 */
export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  showIcon = true,
  dismissible = false,
  onDismiss,
  className,
}) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const variantStyles = {
    info: {
      container: 'bg-[var(--slds-g-color-brand-base-90)] border-[var(--slds-g-color-brand-base-50)]',
      icon: 'text-[var(--slds-g-color-brand-base-50)]',
      title: 'text-[var(--slds-g-color-brand-base-30)]',
      text: 'text-[var(--slds-g-color-brand-base-40)]',
    },
    success: {
      container: 'bg-[var(--slds-g-color-success-base-90)] border-[var(--slds-g-color-success-base-50)]',
      icon: 'text-[var(--slds-g-color-success-base-50)]',
      title: 'text-[var(--slds-g-color-success-base-30)]',
      text: 'text-[var(--slds-g-color-success-base-40)]',
    },
    warning: {
      container: 'bg-[var(--slds-g-color-warning-base-90)] border-[var(--slds-g-color-warning-base-50)]',
      icon: 'text-[var(--slds-g-color-warning-base-50)]',
      title: 'text-[var(--slds-g-color-warning-base-30)]',
      text: 'text-[var(--slds-g-color-warning-base-40)]',
    },
    error: {
      container: 'bg-[var(--slds-g-color-error-base-90)] border-[var(--slds-g-color-error-base-50)]',
      icon: 'text-[var(--slds-g-color-error-base-50)]',
      title: 'text-[var(--slds-g-color-error-base-30)]',
      text: 'text-[var(--slds-g-color-error-base-40)]',
    },
  };

  const Icon = icons[variant];
  const styles = variantStyles[variant];

  return (
    <div
      role="alert"
      className={clsx(
        'flex gap-3 p-4 rounded-lg border-l-4',
        styles.container,
        className
      )}
    >
      {showIcon && (
        <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', styles.icon)} />
      )}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={clsx('font-semibold mb-1', styles.title)}>{title}</h4>
        )}
        <div className={clsx('text-sm', styles.text)}>{children}</div>
      </div>
      
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={clsx(
            'flex-shrink-0 p-1 rounded-md',
            'hover:bg-black/5 transition-colors',
            styles.icon
          )}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';

/**
 * Inline Alert for compact spaces
 */
export interface InlineAlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  children,
  variant = 'info',
  className,
}) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const colors = {
    info: 'text-[var(--slds-g-color-brand-base-50)]',
    success: 'text-[var(--slds-g-color-success-base-50)]',
    warning: 'text-[var(--slds-g-color-warning-base-50)]',
    error: 'text-[var(--slds-g-color-error-base-50)]',
  };

  const Icon = icons[variant];

  return (
    <div className={clsx('flex items-center gap-2 text-sm', colors[variant], className)}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
};

InlineAlert.displayName = 'InlineAlert';


