# Figma Plugin Boilerplate

A production-ready Figma plugin starter with a custom design system and Storybook for component development.

## Features

- 🎨 **Custom Design System** - Tokens (colors, typography, spacing) + reusable components
- 📚 **Storybook Integration** - Develop and document components in isolation
- 🔷 **TypeScript** - Full type safety across UI and plugin code
- ⚡ **esbuild** - Fast builds with hot reload support
- 💬 **Type-Safe Messaging** - Typed communication between UI and plugin sandbox
- 🧩 **React 18** - Modern React with hooks

## Quick Start

```bash
# Install dependencies
npm install

# Start development mode (watches for changes)
npm run dev

# Build for production
npm run build

# Run Storybook for component development
npm run storybook
```

## Project Structure

```
figma-plugin-boilerplate/
├── .storybook/              # Storybook configuration
├── dist/                    # Build output (generated)
├── scripts/
│   └── build.ts             # esbuild configuration
├── src/
│   ├── design-system/       # 🎨 YOUR DESIGN SYSTEM
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── *.stories.tsx  # Storybook stories
│   │   ├── tokens/          # Design tokens
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   └── shadows.ts
│   │   └── index.ts
│   ├── lib/
│   │   └── messaging.ts     # Type-safe message passing
│   ├── styles/
│   │   └── globals.css      # Global CSS & utilities
│   ├── App.tsx              # Example plugin UI
│   ├── code.ts              # Plugin sandbox code
│   ├── ui.html              # HTML shell
│   └── ui.tsx               # UI entry point
├── manifest.json            # Figma plugin manifest
├── package.json
└── tsconfig.json
```

## Design System Components

### Available Components

| Component | Description |
|-----------|-------------|
| `Button` | Multi-variant button with loading states |
| `Input` | Text input with label, icons, validation |
| `Select` | Dropdown select with options |
| `TextArea` | Multi-line text input |
| `Toggle` | On/off switch toggle |
| `Checkbox` | Checkbox with indeterminate state |
| `Modal` | Dialog modal with header/footer |
| `Tabs` | Tab navigation (underline, pills, enclosed) |
| `Badge` | Status labels and tags |
| `Spinner` | Loading indicator |

### Using Components

```tsx
import { Button, Input, Select, Modal } from './design-system/components';

function MyComponent() {
  return (
    <div>
      <Input label="Name" placeholder="Enter name" />
      <Button variant="primary" onClick={handleClick}>
        Save
      </Button>
    </div>
  );
}
```

### Customizing Tokens

Edit the token files in `src/design-system/tokens/`:

```typescript
// colors.ts
export const colors = {
  brand: {
    primary: '#YOUR_BRAND_COLOR',
    // ...
  },
};
```

## Message Passing

Type-safe communication between UI and plugin:

```typescript
// In UI (React)
import { sendToPlugin, onPluginMessage } from './lib/messaging';

// Send message to plugin
sendToPlugin({ type: 'CAPTURE_SCREENSHOT' });

// Listen for responses
useEffect(() => {
  return onPluginMessage((msg) => {
    if (msg.type === 'SCREENSHOT_RESULT') {
      setImage(msg.base64);
    }
  });
}, []);
```

```typescript
// In plugin (code.ts)
figma.ui.onmessage = (msg) => {
  if (msg.type === 'CAPTURE_SCREENSHOT') {
    // Handle screenshot capture
    figma.ui.postMessage({
      type: 'SCREENSHOT_RESULT',
      base64: dataUrl,
    });
  }
};
```

## Storybook

Develop components in isolation with Storybook:

```bash
npm run storybook
```

This opens Storybook at `http://localhost:6006` where you can:
- View all components with documentation
- Test different props and variants
- See live examples

### Writing Stories

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
};

export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: {
    children: 'Click me',
    variant: 'primary',
  },
};
```

## Building for Production

```bash
npm run build
```

This creates optimized files in `dist/`:
- `code.js` - Plugin sandbox code
- `ui.html` - UI with inlined JavaScript

## Loading in Figma

1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `manifest.json` file from this directory
4. Your plugin appears in the Development section

## Creating a New Plugin

1. Copy this boilerplate folder
2. Update `manifest.json` with your plugin name and ID
3. Modify `src/App.tsx` for your UI
4. Add message handlers in `src/code.ts`
5. Customize design system tokens as needed

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with watch |
| `npm run build` | Build for production |
| `npm run storybook` | Run Storybook dev server |
| `npm run build-storybook` | Build static Storybook |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |

## License

MIT

