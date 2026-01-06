import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { MoreHorizontal } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>Card Title</CardHeader>
      <CardContent>
        This is a basic card with a header and content. Cards are great for grouping
        related information together.
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>Confirm Action</CardHeader>
      <CardContent>
        Are you sure you want to continue? This action cannot be undone.
      </CardContent>
      <CardFooter>
        <Button variant="neutral" size="small">Cancel</Button>
        <Button variant="brand" size="small">Confirm</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithHeaderAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader action={
        <button className="p-1 hover:bg-[var(--slds-g-color-neutral-base-95)] rounded">
          <MoreHorizontal className="w-4 h-4 text-[var(--slds-g-color-neutral-base-60)]" />
        </button>
      }>
        Pattern Details
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--slds-g-color-neutral-base-60)]">Category:</span>
            <Badge variant="brand">Navigation</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--slds-g-color-neutral-base-60)]">Status:</span>
            <Badge variant="success">Active</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Hoverable: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card className="w-60" hoverable>
        <CardHeader>Hover Me</CardHeader>
        <CardContent>This card has a hover effect.</CardContent>
      </Card>
      <Card className="w-60" hoverable onClick={() => alert('Clicked!')}>
        <CardHeader>Click Me</CardHeader>
        <CardContent>This card is clickable.</CardContent>
      </Card>
    </div>
  ),
};

export const Variations: Story = {
  render: () => (
    <div className="space-y-4">
      <Card className="w-80" shadow="none" bordered={false}>
        <CardContent>No shadow, no border</CardContent>
      </Card>
      <Card className="w-80" shadow="small">
        <CardContent>Small shadow</CardContent>
      </Card>
      <Card className="w-80" shadow="medium">
        <CardContent>Medium shadow</CardContent>
      </Card>
      <Card className="w-80" shadow="large">
        <CardContent>Large shadow</CardContent>
      </Card>
    </div>
  ),
};

export const DifferentRadii: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card className="w-40" radius="none">
        <CardContent>No radius</CardContent>
      </Card>
      <Card className="w-40" radius="small">
        <CardContent>Small</CardContent>
      </Card>
      <Card className="w-40" radius="medium">
        <CardContent>Medium</CardContent>
      </Card>
      <Card className="w-40" radius="large">
        <CardContent>Large</CardContent>
      </Card>
    </div>
  ),
};


