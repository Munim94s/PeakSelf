import { useState } from 'react';

/**
 * ErrorTest component for testing ErrorBoundary
 * Only rendered in development mode
 * Add to a route to test error handling
 */
function ErrorTest() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // This will throw an error and be caught by ErrorBoundary
    throw new Error('Test error from ErrorTest component');
  }

  const triggerAsyncError = async () => {
    // Simulate an async error
    await new Promise(resolve => setTimeout(resolve, 100));
    setShouldError(true);
  };

  const triggerTypeError = () => {
    // Trigger a TypeError
    const obj = null;
    obj.property.nested; // Will throw "Cannot read property 'nested' of null"
  };

  const triggerReferenceError = () => {
    // Trigger a ReferenceError
    undefinedVariable.someMethod(); // Will throw "undefinedVariable is not defined"
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: '#fff3cd',
      border: '2px solid #ffc107',
      borderRadius: '0.5rem',
      margin: '2rem',
    }}>
      <h2 style={{ marginTop: 0 }}>Error Boundary Test (Dev Only)</h2>
      <p style={{ color: '#856404' }}>
        Click any button to trigger different types of errors and test the ErrorBoundary:
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShouldError(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          Throw Error (Sync)
        </button>
        <button
          onClick={triggerAsyncError}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          Throw Error (Async)
        </button>
        <button
          onClick={triggerTypeError}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          TypeError
        </button>
        <button
          onClick={triggerReferenceError}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
        >
          ReferenceError
        </button>
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#856404' }}>
        ⚠️ After triggering an error, use "Try Again" button to reset the error state.
      </p>
    </div>
  );
}

export default ErrorTest;
