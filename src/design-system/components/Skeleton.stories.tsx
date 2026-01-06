import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    width: 200,
    height: 20,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--slds-g-color-neutral-base-60)] mb-2">Text</p>
        <Skeleton variant="text" width={200} />
      </div>
      <div>
        <p className="text-xs text-[var(--slds-g-color-neutral-base-60)] mb-2">Circular</p>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <div>
        <p className="text-xs text-[var(--slds-g-color-neutral-base-60)] mb-2">Rectangular</p>
        <Skeleton variant="rectangular" width={200} height={100} />
      </div>
      <div>
        <p className="text-xs text-[var(--slds-g-color-neutral-base-60)] mb-2">Rounded</p>
        <Skeleton variant="rounded" width={200} height={100} />
      </div>
    </div>
  ),
};

export const TextBlock: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonText lines={4} />
    </div>
  ),
};

export const Avatar: Story = {
  render: () => (
    <div className="flex gap-4">
      <SkeletonAvatar size="small" />
      <SkeletonAvatar size="medium" />
      <SkeletonAvatar size="large" />
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonCard />
    </div>
  ),
};

export const ListSkeleton: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonAvatar size="medium" />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  ),
};

export const FormSkeleton: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-2">
        <Skeleton width={80} height={14} />
        <Skeleton width="100%" height={40} variant="rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton width={100} height={14} />
        <Skeleton width="100%" height={40} variant="rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton width={120} height={14} />
        <Skeleton width="100%" height={80} variant="rounded" />
      </div>
      <div className="flex gap-2 justify-end">
        <Skeleton width={80} height={36} variant="rounded" />
        <Skeleton width={80} height={36} variant="rounded" />
      </div>
    </div>
  ),
};


