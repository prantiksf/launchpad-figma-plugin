import React from 'react';
import { clsx } from 'clsx';

export interface ProgressBarProps {
  /** Current value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Color variant */
  variant?: 'brand' | 'success' | 'warning' | 'error';
  /** Show value label */
  showLabel?: boolean;
  /** Label format */
  labelFormat?: 'percent' | 'value' | 'custom';
  /** Custom label */
  customLabel?: string;
  /** Indeterminate loading state */
  indeterminate?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * ProgressBar Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <ProgressBar value={60} />
 * <ProgressBar value={75} showLabel variant="success" />
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'medium',
  variant = 'brand',
  showLabel = false,
  labelFormat = 'percent',
  customLabel,
  indeterminate = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3',
  };

  const variantStyles = {
    brand: 'bg-[var(--slds-g-color-brand-base-50)]',
    success: 'bg-[var(--slds-g-color-success-base-50)]',
    warning: 'bg-[var(--slds-g-color-warning-base-50)]',
    error: 'bg-[var(--slds-g-color-error-base-50)]',
  };

  const getLabel = () => {
    if (customLabel) return customLabel;
    if (labelFormat === 'percent') return `${Math.round(percentage)}%`;
    if (labelFormat === 'value') return `${value}/${max}`;
    return '';
  };

  return (
    <div className={clsx('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-[var(--slds-g-color-neutral-base-40)]">
            Progress
          </span>
          <span className="text-xs font-medium text-[var(--slds-g-color-neutral-base-40)]">
            {getLabel()}
          </span>
        </div>
      )}
      
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={clsx(
          'w-full rounded-full overflow-hidden',
          'bg-[var(--slds-g-color-neutral-base-90)]',
          sizeStyles[size]
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            variantStyles[variant],
            indeterminate && 'animate-indeterminate'
          )}
          style={{ width: indeterminate ? '30%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';

/**
 * Circular Progress indicator
 */
export interface CircularProgressProps {
  /** Current value (0-100) */
  value: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color variant */
  variant?: 'brand' | 'success' | 'warning' | 'error';
  /** Show center label */
  showLabel?: boolean;
  /** Additional className */
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 48,
  strokeWidth = 4,
  variant = 'brand',
  showLabel = false,
  className,
}) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const variantColors = {
    brand: 'var(--slds-g-color-brand-base-50)',
    success: 'var(--slds-g-color-success-base-50)',
    warning: 'var(--slds-g-color-warning-base-50)',
    error: 'var(--slds-g-color-error-base-50)',
  };

  return (
    <div
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--slds-g-color-neutral-base-90)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={variantColors[variant]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      
      {showLabel && (
        <span className="absolute text-xs font-semibold text-[var(--slds-g-color-neutral-base-30)]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

CircularProgress.displayName = 'CircularProgress';


