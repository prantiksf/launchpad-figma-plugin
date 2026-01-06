import React from 'react';
import { clsx } from 'clsx';
import { User } from 'lucide-react';

export interface AvatarProps {
  /** Image source */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Initials to show if no image */
  initials?: string;
  /** Size variant */
  size?: 'xs' | 'small' | 'medium' | 'large' | 'xl';
  /** Shape */
  shape?: 'circle' | 'square';
  /** Status indicator */
  status?: 'online' | 'offline' | 'busy' | 'away';
  /** Additional className */
  className?: string;
}

/**
 * Avatar Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Avatar src="/user.jpg" alt="John Doe" />
 * <Avatar initials="JD" />
 * <Avatar status="online" />
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size = 'medium',
  shape = 'circle',
  status,
  className,
}) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const statusSizes = {
    xs: 'w-2 h-2',
    small: 'w-2.5 h-2.5',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
    xl: 'w-5 h-5',
  };

  const statusColors = {
    online: 'bg-[var(--slds-g-color-success-base-50)]',
    offline: 'bg-[var(--slds-g-color-neutral-base-60)]',
    busy: 'bg-[var(--slds-g-color-error-base-50)]',
    away: 'bg-[var(--slds-g-color-warning-base-50)]',
  };

  return (
    <div className={clsx('relative inline-flex', className)}>
      <div
        className={clsx(
          'flex items-center justify-center overflow-hidden',
          'bg-[var(--slds-g-color-neutral-base-90)]',
          'text-[var(--slds-g-color-neutral-base-50)]',
          'font-medium',
          sizeStyles[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-lg'
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt || ''}
            className="w-full h-full object-cover"
          />
        ) : initials ? (
          <span>{initials.slice(0, 2).toUpperCase()}</span>
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </div>
      
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0',
            'rounded-full ring-2 ring-[var(--slds-g-color-neutral-base-100)]',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';

/**
 * Avatar Group - Stack of avatars
 */
export interface AvatarGroupProps {
  /** Avatar components */
  children: React.ReactNode;
  /** Maximum avatars to show */
  max?: number;
  /** Size of avatars */
  size?: AvatarProps['size'];
  /** Additional className */
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 4,
  size = 'medium',
  className,
}) => {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const overlapStyles = {
    xs: '-space-x-2',
    small: '-space-x-2',
    medium: '-space-x-3',
    large: '-space-x-4',
    xl: '-space-x-5',
  };

  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    small: 'w-8 h-8 text-xs',
    medium: 'w-10 h-10 text-sm',
    large: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  return (
    <div className={clsx('flex items-center', overlapStyles[size], className)}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className="ring-2 ring-[var(--slds-g-color-neutral-base-100)] rounded-full"
        >
          {React.isValidElement(avatar) ? React.cloneElement(avatar as React.ReactElement<AvatarProps>, { size }) : avatar}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center',
            'rounded-full ring-2 ring-[var(--slds-g-color-neutral-base-100)]',
            'bg-[var(--slds-g-color-neutral-base-80)]',
            'text-[var(--slds-g-color-neutral-base-40)]',
            'font-medium',
            sizeStyles[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

AvatarGroup.displayName = 'AvatarGroup';


