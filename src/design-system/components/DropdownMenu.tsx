import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownMenuProps {
  /** Trigger element or button label */
  trigger: React.ReactNode;
  /** Menu items */
  children: React.ReactNode;
  /** Alignment */
  align?: 'left' | 'right';
  /** Width */
  width?: 'auto' | 'trigger' | number;
  /** Additional className */
  className?: string;
}

/**
 * Dropdown Menu Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <DropdownMenu trigger={<Button>Actions</Button>}>
 *   <DropdownMenuItem onClick={() => {}}>Edit</DropdownMenuItem>
 *   <DropdownMenuItem onClick={() => {}}>Delete</DropdownMenuItem>
 * </DropdownMenu>
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'left',
  width = 'auto',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const widthStyle = 
    width === 'auto' ? 'min-w-[10rem]' :
    width === 'trigger' ? 'min-w-full' :
    `w-[${width}px]`;

  return (
    <div ref={menuRef} className={clsx('relative inline-block', className)}>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-1 py-1',
            'bg-[var(--slds-g-color-neutral-base-100)]',
            'border border-[var(--slds-g-color-neutral-base-90)]',
            'rounded-lg shadow-lg',
            'animate-in fade-in slide-in-from-top-2 duration-150',
            align === 'right' ? 'right-0' : 'left-0',
            widthStyle
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
};

DropdownMenu.displayName = 'DropdownMenu';

export interface DropdownMenuItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Selected state */
  selected?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive styling */
  destructive?: boolean;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  icon,
  selected = false,
  disabled = false,
  destructive = false,
  className,
}) => {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2 text-sm text-left',
        'transition-colors duration-100',
        'focus:outline-none',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : destructive
            ? 'text-[var(--slds-g-color-error-base-50)] hover:bg-[var(--slds-g-color-error-base-90)]'
            : 'text-[var(--slds-g-color-neutral-base-30)] hover:bg-[var(--slds-g-color-neutral-base-95)]',
        selected && 'bg-[var(--slds-g-color-brand-base-90)]',
        className
      )}
    >
      {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
      <span className="flex-1">{children}</span>
      {selected && <Check className="w-4 h-4 text-[var(--slds-g-color-brand-base-50)]" />}
    </button>
  );
};

DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuDivider: React.FC = () => {
  return <div className="my-1 border-t border-[var(--slds-g-color-neutral-base-90)]" />;
};

DropdownMenuDivider.displayName = 'DropdownMenuDivider';

export interface DropdownMenuLabelProps {
  children: React.ReactNode;
}

export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps> = ({ children }) => {
  return (
    <div className="px-4 py-2 text-xs font-semibold text-[var(--slds-g-color-neutral-base-60)] uppercase tracking-wider">
      {children}
    </div>
  );
};

DropdownMenuLabel.displayName = 'DropdownMenuLabel';


