import type { Preview } from '@storybook/react';

// Import our global styles (includes SLDS 2 Cosmos tokens)
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'gray', value: '#F7F7F7' },
        { name: 'dark', value: '#1A1A1A' },
      ],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default preview;
