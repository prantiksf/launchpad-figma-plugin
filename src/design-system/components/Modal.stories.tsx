import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal, ConfirmModal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Interactive wrapper for stories
const ModalDemo = ({ 
  children, 
  triggerText = 'Open Modal',
  ...props 
}: { 
  children: React.ReactNode; 
  triggerText?: string;
} & Partial<React.ComponentProps<typeof Modal>>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="brand" onClick={() => setIsOpen(true)}>{triggerText}</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} {...props}>
        {children}
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: () => (
    <ModalDemo title="Modal Title">
      <p className="text-sm text-[var(--slds-g-color-neutral-base-40)]">
        This is a basic modal with a title and some content.
      </p>
    </ModalDemo>
  ),
};

export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="brand" onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          footer={
            <>
              <Button variant="neutral" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="brand" onClick={() => { alert('Confirmed!'); setIsOpen(false); }}>Confirm</Button>
            </>
          }
        >
          <p className="text-sm text-[var(--slds-g-color-neutral-base-40)]">
            Are you sure you want to proceed with this action?
          </p>
        </Modal>
      </>
    );
  },
};

export const FormModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="brand" onClick={() => setIsOpen(true)}>Create Pattern</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Create New Pattern"
          size="md"
          footer={
            <>
              <Button variant="neutral" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="brand" onClick={() => setIsOpen(false)}>Create</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Pattern Name" placeholder="Enter pattern name" required />
            <Select
              label="Category"
              options={[
                { value: 'navigation', label: 'Navigation' },
                { value: 'form', label: 'Form' },
                { value: 'data-display', label: 'Data Display' },
              ]}
              placeholder="Select category..."
              required
            />
            <Input label="Description" placeholder="Brief description" />
          </div>
        </Modal>
      </>
    );
  },
};

export const Sizes: Story = {
  render: () => {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | null>(null);
    return (
      <div className="flex gap-2">
        <Button variant="neutral" onClick={() => setSize('sm')}>Small</Button>
        <Button variant="neutral" onClick={() => setSize('md')}>Medium</Button>
        <Button variant="neutral" onClick={() => setSize('lg')}>Large</Button>
        <Button variant="neutral" onClick={() => setSize('xl')}>XL</Button>
        
        {size && (
          <Modal
            isOpen={true}
            onClose={() => setSize(null)}
            title={`${size.toUpperCase()} Modal`}
            size={size}
          >
            <p className="text-sm text-[var(--slds-g-color-neutral-base-40)]">
              This is a {size} sized modal.
            </p>
          </Modal>
        )}
      </div>
    );
  },
};

export const ConfirmDialog: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setIsOpen(true)}>Delete Item</Button>
        <ConfirmModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => { alert('Deleted!'); setIsOpen(false); }}
          title="Delete Item"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </>
    );
  },
};

export const DestructiveConfirm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const handleConfirm = () => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setIsOpen(false);
        alert('Action completed!');
      }, 2000);
    };
    
    return (
      <>
        <Button variant="destructive" onClick={() => setIsOpen(true)}>Delete Account</Button>
        <ConfirmModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title="Delete Account"
          message="This will permanently delete your account and all associated data. This action cannot be undone."
          confirmText="Delete Account"
          variant="destructive"
          loading={loading}
        />
      </>
    );
  },
};


