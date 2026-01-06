import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Toggle } from './Toggle';
import { Checkbox } from './Checkbox';
import { Badge } from './Badge';
import { Alert } from './Alert';
import { Card, CardHeader, CardContent, CardFooter } from './Card';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from './Tabs';
import { Accordion, AccordionItem } from './Accordion';
import { Avatar, AvatarGroup } from './Avatar';
import { Spinner } from './Spinner';
import { ProgressBar, CircularProgress } from './ProgressBar';
import { Divider } from './Divider';
import { EmptyState } from './EmptyState';

const meta: Meta = {
  title: 'Overview/All Components',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

export const ComponentShowcase: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Buttons */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="base">Base</Button>
          <Button variant="neutral">Neutral</Button>
          <Button variant="brand">Brand</Button>
          <Button variant="brand-outline">Brand Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="destructive-text">Destructive Text</Button>
          <Button variant="success">Success</Button>
        </div>
      </section>

      <Divider />

      {/* Form Controls */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Form Controls</h2>
        <div className="grid grid-cols-2 gap-6">
          <Input label="Text Input" placeholder="Enter text..." />
          <Select 
            label="Select"
            options={[
              { value: '1', label: 'Option 1' },
              { value: '2', label: 'Option 2' },
            ]}
            placeholder="Choose..."
          />
          <Toggle label="Toggle switch" />
          <Checkbox label="Checkbox option" />
        </div>
      </section>

      <Divider />

      {/* Badges */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="inverse">Inverse</Badge>
        </div>
      </section>

      <Divider />

      {/* Alerts */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Alerts</h2>
        <div className="space-y-3">
          <Alert variant="info">Information alert</Alert>
          <Alert variant="success">Success alert</Alert>
          <Alert variant="warning">Warning alert</Alert>
          <Alert variant="error">Error alert</Alert>
        </div>
      </section>

      <Divider />

      {/* Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Cards</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>Card Title</CardHeader>
            <CardContent>Card content goes here.</CardContent>
            <CardFooter>
              <Button variant="neutral" size="small">Cancel</Button>
              <Button variant="brand" size="small">Save</Button>
            </CardFooter>
          </Card>
          <Card hoverable>
            <CardHeader>Hoverable Card</CardHeader>
            <CardContent>Hover over this card to see the effect.</CardContent>
          </Card>
        </div>
      </section>

      <Divider />

      {/* Tabs */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Tabs</h2>
        <Tabs defaultTab="tab1">
          <TabList>
            <Tab id="tab1">Overview</Tab>
            <Tab id="tab2">Details</Tab>
            <Tab id="tab3">Settings</Tab>
          </TabList>
          <TabPanels>
            <TabPanel id="tab1">Overview content</TabPanel>
            <TabPanel id="tab2">Details content</TabPanel>
            <TabPanel id="tab3">Settings content</TabPanel>
          </TabPanels>
        </Tabs>
      </section>

      <Divider />

      {/* Accordion */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Accordion</h2>
        <Accordion defaultOpen={['1']}>
          <AccordionItem id="1" title="Section One">Content for section one</AccordionItem>
          <AccordionItem id="2" title="Section Two">Content for section two</AccordionItem>
          <AccordionItem id="3" title="Section Three">Content for section three</AccordionItem>
        </Accordion>
      </section>

      <Divider />

      {/* Avatars */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Avatars</h2>
        <div className="flex items-center gap-6">
          <Avatar initials="JD" size="small" />
          <Avatar initials="AB" size="medium" status="online" />
          <Avatar initials="CD" size="large" status="busy" />
          <AvatarGroup>
            <Avatar initials="A" />
            <Avatar initials="B" />
            <Avatar initials="C" />
            <Avatar initials="D" />
            <Avatar initials="E" />
          </AvatarGroup>
        </div>
      </section>

      <Divider />

      {/* Progress */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Progress</h2>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Spinner size="small" />
            <Spinner size="medium" variant="brand" />
            <Spinner size="large" />
          </div>
          <ProgressBar value={60} showLabel />
          <div className="flex gap-4">
            <CircularProgress value={25} showLabel />
            <CircularProgress value={50} showLabel variant="success" />
            <CircularProgress value={75} showLabel variant="warning" />
          </div>
        </div>
      </section>

      <Divider />

      {/* Empty State */}
      <section>
        <h2 className="text-lg font-semibold mb-4 text-[var(--slds-g-color-neutral-base-20)]">Empty State</h2>
        <Card>
          <EmptyState
            type="empty"
            title="No patterns yet"
            description="Get started by creating your first design pattern."
            action={<Button variant="brand">Create Pattern</Button>}
          />
        </Card>
      </section>
    </div>
  ),
};


