import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111827',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '2rem',
        boxSizing: 'border-box',
      }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 .5rem', color: '#f1f5f9' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '.875rem', color: '#94a3b8', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            An unexpected error occurred. This is often caused by corrupted saved data. You can try reloading, or reset all data to start fresh.
          </p>
          {this.state.error?.message && (
            <pre style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '.75rem 1rem',
              fontSize: '.75rem',
              color: '#f87171',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '1.5rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '.6rem 1.25rem',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '.875rem',
                fontWeight: 500,
              }}
            >
              Try reloading
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '.6rem 1.25rem',
                borderRadius: 8,
                border: 'none',
                background: '#ef4444',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '.875rem',
                fontWeight: 600,
              }}
            >
              Reset all data
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
