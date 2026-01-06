import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

const categoryOptions = [
  { value: 'navigation', label: 'Navigation' },
  { value: 'form', label: 'Form' },
  { value: 'data-display', label: 'Data Display' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'layout', label: 'Layout' },
];

export const Default: Story = {
  args: {
    options: statusOptions,
    placeholder: 'Select status...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Status',
    options: statusOptions,
    placeholder: 'Select status...',
  },
};

export const Required: Story = {
  args: {
    label: 'Category',
    options: categoryOptions,
    placeholder: 'Select category...',
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Priority',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' },
    ],
    placeholder: 'Select priority...',
    helperText: 'Select the priority level for this task',
  },
};

export const WithError: Story = {
  args: {
    label: 'Status',
    options: statusOptions,
    placeholder: 'Select status...',
    error: true,
    errorMessage: 'Please select a status',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <Select size="small" label="Small" options={statusOptions} placeholder="Small select" />
      <Select size="medium" label="Medium" options={statusOptions} placeholder="Medium select" />
      <Select size="large" label="Large" options={statusOptions} placeholder="Large select" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Select',
    options: statusOptions,
    placeholder: 'Select status...',
    disabled: true,
  },
};

export const WithDisabledOptions: Story = {
  args: {
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending', disabled: true },
      { value: 'archived', label: 'Archived', disabled: true },
    ],
    placeholder: 'Select status...',
    helperText: 'Some options are disabled',
  },
};
