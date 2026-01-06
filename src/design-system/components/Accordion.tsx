import React, { createContext, useContext, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

// Context for accordion state
interface AccordionContextValue {
  openItems: string[];
  toggleItem: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps {
  /** Child AccordionItem components */
  children: React.ReactNode;
  /** Allow multiple items open at once */
  allowMultiple?: boolean;
  /** Default open items */
  defaultOpen?: string[];
  /** Additional className */
  className?: string;
}

/**
 * Accordion Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Accordion>
 *   <AccordionItem id="1" title="Section 1">Content 1</AccordionItem>
 *   <AccordionItem id="2" title="Section 2">Content 2</AccordionItem>
 * </Accordion>
 */
export const Accordion: React.FC<AccordionProps> = ({
  children,
  allowMultiple = false,
  defaultOpen = [],
  className,
}) => {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (allowMultiple) {
        return [...prev, id];
      }
      return [id];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, allowMultiple }}>
      <div className={clsx('divide-y divide-[var(--slds-g-color-neutral-base-90)]', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

Accordion.displayName = 'Accordion';

export interface AccordionItemProps {
  /** Unique identifier */
  id: string;
  /** Title shown in header */
  title: React.ReactNode;
  /** Content when expanded */
  children: React.ReactNode;
  /** Icon to show before title */
  icon?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  children,
  icon,
  disabled = false,
  className,
}) => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion');
  }

  const { openItems, toggleItem } = context;
  const isOpen = openItems.includes(id);

  return (
    <div className={clsx('first:rounded-t-lg last:rounded-b-lg', className)}>
      <button
        type="button"
        onClick={() => !disabled && toggleItem(id)}
        disabled={disabled}
        aria-expanded={isOpen}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3',
          'text-left font-medium',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--slds-g-color-brand-base-50)]/30',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-[var(--slds-g-color-neutral-base-95)] cursor-pointer'
        )}
      >
        {icon && (
          <span className="flex-shrink-0 text-[var(--slds-g-color-neutral-base-60)]">
            {icon}
          </span>
        )}
        <span className="flex-1 text-[var(--slds-g-color-neutral-base-20)]">{title}</span>
        <ChevronDown
          className={clsx(
            'w-5 h-5 text-[var(--slds-g-color-neutral-base-60)]',
            'transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      
      <div
        className={clsx(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 py-3 text-sm text-[var(--slds-g-color-neutral-base-40)]">
          {children}
        </div>
      </div>
    </div>
  );
};

AccordionItem.displayName = 'AccordionItem';


