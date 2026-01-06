import React from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps {
  /** Width (can be number for px or string like '100%') */
  width?: number | string;
  /** Height (can be number for px or string) */
  height?: number | string;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Animation */
  animation?: 'pulse' | 'wave' | 'none';
  /** Additional className */
  className?: string;
}

/**
 * Skeleton Component (SLDS 2 Cosmos Theme)
 * 
 * Loading placeholder for content.
 * 
 * @example
 * <Skeleton width={200} height={20} />
 * <Skeleton variant="circular" width={40} height={40} />
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = 'text',
  animation = 'pulse',
  className,
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height || (variant === 'text' ? '1em' : undefined),
  };

  return (
    <div
      className={clsx(
        'bg-[var(--slds-g-color-neutral-base-90)]',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

Skeleton.displayName = 'Skeleton';

/**
 * Skeleton Text - Multiple lines of text
 */
export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Gap between lines */
  gap?: 'small' | 'medium' | 'large';
  /** Last line width percentage */
  lastLineWidth?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  gap = 'medium',
  lastLineWidth = 60,
  className,
}) => {
  const gapStyles = {
    small: 'space-y-1',
    medium: 'space-y-2',
    large: 'space-y-3',
  };

  return (
    <div className={clsx(gapStyles[gap], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? `${lastLineWidth}%` : '100%'}
          height={16}
        />
      ))}
    </div>
  );
};

SkeletonText.displayName = 'SkeletonText';

/**
 * Skeleton Avatar
 */
export interface SkeletonAvatarProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'medium',
  className,
}) => {
  const sizes = {
    small: 32,
    medium: 40,
    large: 56,
  };

  return (
    <Skeleton
      variant="circular"
      width={sizes[size]}
      height={sizes[size]}
      className={className}
    />
  );
};

SkeletonAvatar.displayName = 'SkeletonAvatar';

/**
 * Skeleton Card - Common card loading pattern
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('p-4 space-y-4 border border-[var(--slds-g-color-neutral-base-90)] rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="medium" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';


