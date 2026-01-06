import React, { createContext, useContext, useState } from 'react';
import { clsx } from 'clsx';

// Context for tabs state
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  variant: 'default' | 'pills' | 'bordered';
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  /** Child Tab components */
  children: React.ReactNode;
  /** Default active tab */
  defaultTab: string;
  /** Visual variant */
  variant?: 'default' | 'pills' | 'bordered';
  /** Controlled active tab */
  activeTab?: string;
  /** Called when tab changes */
  onTabChange?: (id: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Tabs Component (SLDS 2 Cosmos Theme)
 * 
 * @example
 * <Tabs defaultTab="tab1">
 *   <TabList>
 *     <Tab id="tab1">Tab 1</Tab>
 *     <Tab id="tab2">Tab 2</Tab>
 *   </TabList>
 *   <TabPanels>
 *     <TabPanel id="tab1">Content 1</TabPanel>
 *     <TabPanel id="tab2">Content 2</TabPanel>
 *   </TabPanels>
 * </Tabs>
 */
export const Tabs: React.FC<TabsProps> = ({
  children,
  defaultTab,
  variant = 'default',
  activeTab: controlledActiveTab,
  onTabChange,
  className,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab);
  
  const activeTab = controlledActiveTab ?? internalActiveTab;
  
  const setActiveTab = (id: string) => {
    if (!controlledActiveTab) {
      setInternalActiveTab(id);
    }
    onTabChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

Tabs.displayName = 'Tabs';

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabList: React.FC<TabListProps> = ({ children, className }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within Tabs');

  const { variant } = context;

  const variantStyles = {
    default: 'border-b border-[var(--slds-g-color-neutral-base-90)]',
    pills: 'bg-[var(--slds-g-color-neutral-base-95)] rounded-lg p-1',
    bordered: 'border border-[var(--slds-g-color-neutral-base-90)] rounded-lg p-1',
  };

  return (
    <div
      role="tablist"
      className={clsx('flex gap-1', variantStyles[variant], className)}
    >
      {children}
    </div>
  );
};

TabList.displayName = 'TabList';

export interface TabProps {
  /** Unique identifier */
  id: string;
  /** Tab label */
  children: React.ReactNode;
  /** Icon to show before label */
  icon?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Badge count */
  badge?: number;
  className?: string;
}

export const Tab: React.FC<TabProps> = ({
  id,
  children,
  icon,
  disabled = false,
  badge,
  className,
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');

  const { activeTab, setActiveTab, variant } = context;
  const isActive = activeTab === id;

  const baseStyles = `
    inline-flex items-center gap-2 px-4 py-2
    text-sm font-medium
    transition-all duration-150
    focus:outline-none
  `;

  const variantStyles = {
    default: clsx(
      'relative -mb-px border-b-2',
      isActive
        ? 'border-[var(--slds-g-color-brand-base-50)] text-[var(--slds-g-color-brand-base-50)]'
        : 'border-transparent text-[var(--slds-g-color-neutral-base-50)] hover:text-[var(--slds-g-color-neutral-base-30)]'
    ),
    pills: clsx(
      'rounded-md',
      isActive
        ? 'bg-[var(--slds-g-color-neutral-base-100)] text-[var(--slds-g-color-neutral-base-20)] shadow-sm'
        : 'text-[var(--slds-g-color-neutral-base-50)] hover:text-[var(--slds-g-color-neutral-base-30)]'
    ),
    bordered: clsx(
      'rounded-md',
      isActive
        ? 'bg-[var(--slds-g-color-brand-base-50)] text-white'
        : 'text-[var(--slds-g-color-neutral-base-50)] hover:bg-[var(--slds-g-color-neutral-base-90)]'
    ),
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      onClick={() => !disabled && setActiveTab(id)}
      disabled={disabled}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {badge !== undefined && (
        <span
          className={clsx(
            'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium',
            isActive
              ? 'bg-[var(--slds-g-color-brand-base-80)] text-[var(--slds-g-color-brand-base-30)]'
              : 'bg-[var(--slds-g-color-neutral-base-90)] text-[var(--slds-g-color-neutral-base-50)]'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

Tab.displayName = 'Tab';

export interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export const TabPanels: React.FC<TabPanelsProps> = ({ children, className }) => {
  return <div className={clsx('mt-4', className)}>{children}</div>;
};

TabPanels.displayName = 'TabPanels';

export interface TabPanelProps {
  /** Must match Tab id */
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, children, className }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');

  const { activeTab } = context;
  
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      className={className}
    >
      {children}
    </div>
  );
};

TabPanel.displayName = 'TabPanel';
