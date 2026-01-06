import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from './Tabs';
import { Home, Settings, User, Bell } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultTab="overview">
      <TabList>
        <Tab id="overview">Overview</Tab>
        <Tab id="details">Details</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="overview">
          <p className="text-sm text-[var(--slds-g-color-neutral-base-40)]">
            This is the overview content. It provides a summary of the main information.
          </p>
        </TabPanel>
        <TabPanel id="details">
          <p className="text-sm text-[var(--slds-g-color-neutral-base-40)]">
            Detailed information goes here. This section contains more specific data.
          </p>
        </TabPanel>
        <TabPanel id="settings">
          <p className="text-sm text-[var(--slds-g-color-neutral-base-40)]">
            Configure your settings in this panel.
          </p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const PillsVariant: Story = {
  render: () => (
    <Tabs defaultTab="all" variant="pills">
      <TabList>
        <Tab id="all">All</Tab>
        <Tab id="active">Active</Tab>
        <Tab id="completed">Completed</Tab>
        <Tab id="archived">Archived</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="all">All items</TabPanel>
        <TabPanel id="active">Active items</TabPanel>
        <TabPanel id="completed">Completed items</TabPanel>
        <TabPanel id="archived">Archived items</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const BorderedVariant: Story = {
  render: () => (
    <Tabs defaultTab="tab1" variant="bordered">
      <TabList>
        <Tab id="tab1">Tab 1</Tab>
        <Tab id="tab2">Tab 2</Tab>
        <Tab id="tab3">Tab 3</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="tab1">Content for Tab 1</TabPanel>
        <TabPanel id="tab2">Content for Tab 2</TabPanel>
        <TabPanel id="tab3">Content for Tab 3</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultTab="home">
      <TabList>
        <Tab id="home" icon={<Home className="w-4 h-4" />}>Home</Tab>
        <Tab id="profile" icon={<User className="w-4 h-4" />}>Profile</Tab>
        <Tab id="notifications" icon={<Bell className="w-4 h-4" />}>Notifications</Tab>
        <Tab id="settings" icon={<Settings className="w-4 h-4" />}>Settings</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="home">Home content</TabPanel>
        <TabPanel id="profile">Profile content</TabPanel>
        <TabPanel id="notifications">Notifications content</TabPanel>
        <TabPanel id="settings">Settings content</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const WithBadges: Story = {
  render: () => (
    <Tabs defaultTab="inbox">
      <TabList>
        <Tab id="inbox" badge={12}>Inbox</Tab>
        <Tab id="sent">Sent</Tab>
        <Tab id="drafts" badge={3}>Drafts</Tab>
        <Tab id="spam" badge={99}>Spam</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="inbox">12 new messages</TabPanel>
        <TabPanel id="sent">Sent messages</TabPanel>
        <TabPanel id="drafts">3 draft messages</TabPanel>
        <TabPanel id="spam">99+ spam messages</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultTab="tab1">
      <TabList>
        <Tab id="tab1">Available</Tab>
        <Tab id="tab2" disabled>Disabled</Tab>
        <Tab id="tab3">Also Available</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="tab1">Content for available tab</TabPanel>
        <TabPanel id="tab2">This content is not accessible</TabPanel>
        <TabPanel id="tab3">Content for another available tab</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};


