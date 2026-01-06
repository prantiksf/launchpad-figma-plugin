import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { ArrowRight, Download, Plus, Trash2 } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['base', 'neutral', 'brand', 'brand-outline', 'destructive', 'destructive-text', 'success'],
      description: 'SLDS 2 Cosmos button variants',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ===== ALL VARIANTS (matching SLDS 2 screenshot) =====
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-600">
        Click the buttons to activate the <code className="bg-gray-100 px-1 rounded">onclick</code> handler and view the label of the clicked button.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="base">Base</Button>
        <Button variant="neutral">Neutral</Button>
        <Button variant="brand">Brand</Button>
        <Button variant="brand-outline">Brand Outline</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="destructive-text">Destructive Text</Button>
        <Button variant="success">Success</Button>
      </div>
    </div>
  ),
};

// ===== INDIVIDUAL VARIANTS =====
export const Base: Story = {
  args: {
    children: 'Base',
    variant: 'base',
  },
};

export const Neutral: Story = {
  args: {
    children: 'Neutral',
    variant: 'neutral',
  },
};

export const Brand: Story = {
  args: {
    children: 'Brand',
    variant: 'brand',
  },
};

export const BrandOutline: Story = {
  args: {
    children: 'Brand Outline',
    variant: 'brand-outline',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

export const DestructiveText: Story = {
  args: {
    children: 'Destructive Text',
    variant: 'destructive-text',
  },
};

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

// ===== SIZES =====
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="brand" size="small">Small</Button>
      <Button variant="brand" size="medium">Medium</Button>
      <Button variant="brand" size="large">Large</Button>
    </div>
  ),
};

// ===== WITH ICONS =====
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="brand" leftIcon={<Plus className="w-4 h-4" />}>
        Create New
      </Button>
      <Button variant="neutral" rightIcon={<ArrowRight className="w-4 h-4" />}>
        Continue
      </Button>
      <Button variant="success" leftIcon={<Download className="w-4 h-4" />}>
        Download
      </Button>
      <Button variant="destructive" leftIcon={<Trash2 className="w-4 h-4" />}>
        Delete
      </Button>
    </div>
  ),
};

// ===== STATES =====
export const Loading: Story = {
  args: {
    children: 'Loading...',
    variant: 'brand',
    loading: true,
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="brand" disabled>Brand Disabled</Button>
      <Button variant="neutral" disabled>Neutral Disabled</Button>
      <Button variant="destructive" disabled>Destructive Disabled</Button>
    </div>
  ),
};

// ===== FULL WIDTH =====
export const FullWidth: Story = {
  render: () => (
    <div className="w-80 space-y-3">
      <Button variant="brand" fullWidth>Full Width Brand</Button>
      <Button variant="neutral" fullWidth>Full Width Neutral</Button>
    </div>
  ),
};
