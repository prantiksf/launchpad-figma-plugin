import type { Meta, StoryObj } from '@storybook/react';
import { Alert, InlineAlert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert variant="info" title="Information">
        This is an informational message to help guide the user.
      </Alert>
      <Alert variant="success" title="Success">
        Your changes have been saved successfully.
      </Alert>
      <Alert variant="warning" title="Warning">
        Please review your changes before submitting.
      </Alert>
      <Alert variant="error" title="Error">
        There was a problem processing your request.
      </Alert>
    </div>
  ),
};

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Did you know?',
    children: 'You can use keyboard shortcuts to speed up your workflow.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Pattern saved!',
    children: 'Your design pattern has been successfully added to the library.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Unsaved changes',
    children: 'You have unsaved changes. Please save before leaving this page.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Connection failed',
    children: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: 'info',
    children: 'This alert has no title, just content.',
  },
};

export const WithoutIcon: Story = {
  args: {
    variant: 'success',
    title: 'No Icon',
    children: 'This alert does not show an icon.',
    showIcon: false,
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'info',
    title: 'Dismissible Alert',
    children: 'Click the X to dismiss this alert.',
    dismissible: true,
    onDismiss: () => alert('Dismissed!'),
  },
};

export const InlineAlerts: Story = {
  render: () => (
    <div className="space-y-2">
      <InlineAlert variant="info">This is inline info</InlineAlert>
      <InlineAlert variant="success">Operation successful</InlineAlert>
      <InlineAlert variant="warning">Please review</InlineAlert>
      <InlineAlert variant="error">Something went wrong</InlineAlert>
    </div>
  ),
};


