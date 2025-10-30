import React from 'react';
import { apiClient } from '../api/client';

/**
 * ErrorBoundary component to catch React errors and display fallback UI
 * Logs errors to backend for monitoring
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to state
    this.setState({
      error,
      errorInfo,
    });

    // Log error to backend
    this.logErrorToBackend(error, errorInfo);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  async logErrorToBackend(error, errorInfo) {
    try {
      const errorData = {
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      const response = await apiClient.post('/api/errors/log', errorData);
      
      if (response.success && response.data?.errorId) {
        this.setState({ errorId: response.data.errorId });
      }
    } catch (err) {
      // Silently fail - don't want error logging to cause more errors
      console.error('Failed to log error to backend:', err);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.iconContainer}>
              <svg
                style={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 style={styles.title}>Something went wrong</h1>
            
            <p style={styles.message}>
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            {this.state.errorId && (
              <p style={styles.errorId}>
                Error ID: <code style={styles.code}>{this.state.errorId}</code>
              </p>
            )}

            <div style={styles.buttonContainer}>
              <button
                onClick={this.handleReset}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Go Home
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Dev Only)</summary>
                <pre style={styles.errorStack}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1rem',
  },
  content: {
    maxWidth: '28rem',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    padding: '2rem',
    textAlign: 'center',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  icon: {
    width: '4rem',
    height: '4rem',
    color: '#ef4444',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '1rem',
  },
  message: {
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  errorId: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '0.125rem 0.5rem',
    borderRadius: '0.25rem',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    backgroundColor: '#000',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  details: {
    marginTop: '1.5rem',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem',
    padding: '1rem',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  errorStack: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#ef4444',
    marginTop: '0.5rem',
    overflow: 'auto',
    maxHeight: '12rem',
  },
};

export default ErrorBoundary;
