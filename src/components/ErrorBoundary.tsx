import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors and shows a fallback UI instead of white screen.
 * Common after Backup & Restore when refreshed data causes a render crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errMsg = this.state.error?.message ?? 'Unknown error';
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            textAlign: 'center',
            background: '#fff',
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#333' }}>
            Something went wrong.
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#999', maxWidth: 280, wordBreak: 'break-word' }}>
            {errMsg}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: '#666' }}>
            Please close the plugin and open it again to recover.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              background: '#0d66d0',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
