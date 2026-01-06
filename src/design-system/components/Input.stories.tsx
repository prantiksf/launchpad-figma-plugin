import type { Meta, StoryObj } from '@storybook/react';
import { Input, SearchInput } from './Input';
import { Mail, Lock, User } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    type: 'email',
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'John Doe',
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: '••••••••',
    helperText: 'Must be at least 8 characters',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    error: true,
    errorMessage: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
};

export const WithIcons: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <Input
        label="Email"
        placeholder="you@example.com"
        leftIcon={<Mail className="w-4 h-4" />}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        leftIcon={<Lock className="w-4 h-4" />}
      />
      <Input
        label="Username"
        placeholder="johndoe"
        leftIcon={<User className="w-4 h-4" />}
      />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <Input size="small" placeholder="Small input" label="Small" />
      <Input size="medium" placeholder="Medium input" label="Medium" />
      <Input size="large" placeholder="Large input" label="Large" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
    defaultValue: 'Disabled value',
  },
};

export const Search: Story = {
  render: () => (
    <div className="w-80">
      <SearchInput placeholder="Search patterns..." />
    </div>
  ),
};
