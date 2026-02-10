import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  section?: string;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.section ?? 'unknown'}]`, error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: '#f87171',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            Something went wrong{this.props.section ? ` in ${this.props.section}` : ''}
          </p>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '6px 16px',
              backgroundColor: '#0f3460',
              color: '#eaeaea',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
