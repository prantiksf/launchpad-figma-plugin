import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    label: 'Enable notifications',
  },
};

export const Checked: Story = {
  args: {
    label: 'Dark mode',
    defaultChecked: true,
  },
};

export const LabelLeft: Story = {
  args: {
    label: 'Auto-save',
    labelPosition: 'left',
    defaultChecked: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Marketing emails',
    helperText: 'Receive updates about new features and promotions',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Toggle size="small" label="Small toggle" />
      <Toggle size="medium" label="Medium toggle" />
      <Toggle size="large" label="Large toggle" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <Toggle label="Disabled off" disabled />
      <Toggle label="Disabled on" disabled defaultChecked />
    </div>
  ),
};

export const SettingsExample: Story = {
  render: () => (
    <div className="w-80 space-y-4 p-4 border border-[var(--slds-g-color-neutral-base-90)] rounded-lg">
      <h3 className="font-semibold text-[var(--slds-g-color-neutral-base-20)]">Settings</h3>
      <div className="space-y-3">
        <Toggle label="Enable auto-sync" defaultChecked />
        <Toggle label="Show tooltips" defaultChecked />
        <Toggle label="Dark mode" />
        <Toggle label="Compact view" />
      </div>
    </div>
  ),
};
