import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionItem } from './Accordion';
import { Settings, User, Bell, Shield } from 'lucide-react';

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
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
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render: () => (
    <Accordion defaultOpen={['1']}>
      <AccordionItem id="1" title="What is this design system?">
        This is a Figma plugin boilerplate with SLDS 2 Cosmos theme styling. It provides
        pre-built components that match Salesforce's latest design system.
      </AccordionItem>
      <AccordionItem id="2" title="How do I use it?">
        Simply import the components from the design system and use them in your plugin.
        All components follow the SLDS 2 visual styling with Cosmos theme colors.
      </AccordionItem>
      <AccordionItem id="3" title="Can I customize the styles?">
        Yes! You can override the CSS variables defined in slds2-tokens.css or add
        additional Tailwind classes to customize the appearance.
      </AccordionItem>
    </Accordion>
  ),
};

export const AllowMultiple: Story = {
  render: () => (
    <Accordion allowMultiple defaultOpen={['1', '2']}>
      <AccordionItem id="1" title="Section One">
        Content for section one. Multiple sections can be open at the same time.
      </AccordionItem>
      <AccordionItem id="2" title="Section Two">
        Content for section two. This is also open by default.
      </AccordionItem>
      <AccordionItem id="3" title="Section Three">
        Content for section three.
      </AccordionItem>
    </Accordion>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Accordion defaultOpen={['settings']}>
      <AccordionItem id="settings" title="Settings" icon={<Settings className="w-4 h-4" />}>
        Configure your plugin settings here.
      </AccordionItem>
      <AccordionItem id="profile" title="Profile" icon={<User className="w-4 h-4" />}>
        Update your profile information.
      </AccordionItem>
      <AccordionItem id="notifications" title="Notifications" icon={<Bell className="w-4 h-4" />}>
        Manage your notification preferences.
      </AccordionItem>
      <AccordionItem id="security" title="Security" icon={<Shield className="w-4 h-4" />}>
        Security and privacy settings.
      </AccordionItem>
    </Accordion>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Accordion>
      <AccordionItem id="1" title="Available Section">
        This section can be expanded.
      </AccordionItem>
      <AccordionItem id="2" title="Disabled Section" disabled>
        This section is disabled.
      </AccordionItem>
      <AccordionItem id="3" title="Another Available Section">
        This section can also be expanded.
      </AccordionItem>
    </Accordion>
  ),
};


