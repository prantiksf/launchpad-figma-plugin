import type { Meta, StoryObj } from '@storybook/react';
import { Badge, StatusBadge } from './Badge';
import { Check, AlertCircle, Clock, Star } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">Default</Badge>
      <Badge variant="brand">Brand</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="inverse">Inverse</Badge>
    </div>
  ),
};

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="success" icon={<Check className="w-3 h-3" />}>Completed</Badge>
      <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>Pending</Badge>
      <Badge variant="error" icon={<AlertCircle className="w-3 h-3" />}>Failed</Badge>
      <Badge variant="brand" icon={<Star className="w-3 h-3" />}>Featured</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="small" variant="brand">Small</Badge>
      <Badge size="medium" variant="brand">Medium</Badge>
      <Badge size="large" variant="brand">Large</Badge>
    </div>
  ),
};

export const Removable: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default" removable onRemove={() => alert('Removed!')}>Tag 1</Badge>
      <Badge variant="brand" removable>Tag 2</Badge>
      <Badge variant="success" removable>Tag 3</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <StatusBadge status="online">Online</StatusBadge>
      <StatusBadge status="offline">Offline</StatusBadge>
      <StatusBadge status="busy">Busy</StatusBadge>
      <StatusBadge status="away">Away</StatusBadge>
    </div>
  ),
};
