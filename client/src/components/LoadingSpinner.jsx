import React from 'react';

/**
 * LoadingSpinner component
 * A sleek black and white spinner for loading states
 * 
 * @param {Object} props
 * @param {string} props.size - Size of spinner: 'small', 'medium', 'large' (default: 'medium')
 * @param {string} props.text - Optional loading text
 * @param {boolean} props.fullHeight - Whether to take full viewport height (default: true)
 */
const LoadingSpinner = ({ size = 'medium', text = 'Loading...', fullHeight = true }) => {
  const sizes = {
    small: { spinner: 32, dots: 8, fontSize: '0.875rem', gap: 4 },
    medium: { spinner: 56, dots: 12, fontSize: '1.2rem', gap: 6 },
    large: { spinner: 80, dots: 16, fontSize: '1.5rem', gap: 8 }
  };

  const dimensions = sizes[size] || sizes.medium;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: fullHeight ? '60vh' : '200px',
      fontSize: dimensions.fontSize,
      color: '#000'
    }}>
      <div style={{ textAlign: 'center' }}>
        {text && (
          <div style={{ 
            marginBottom: '1.5rem', 
            textAlign: 'center',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#000'
          }}>
            {text}
          </div>
        )}
        <div style={{
          position: 'relative',
          width: `${dimensions.spinner}px`,
          height: `${dimensions.spinner}px`,
          margin: '0 auto'
        }}>
          {/* Outer rotating ring */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            border: '3px solid rgba(0, 0, 0, 0.1)',
            borderTop: '3px solid #000',
            borderRadius: '50%',
            animation: 'spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite'
          }} />
          {/* Inner counter-rotating ring */}
          <div style={{
            position: 'absolute',
            width: '70%',
            height: '70%',
            top: '15%',
            left: '15%',
            border: '2px solid rgba(0, 0, 0, 0.1)',
            borderBottom: '2px solid #000',
            borderRadius: '50%',
            animation: 'spin-reverse 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
          }} />
          {/* Center dot pulse */}
          <div style={{
            position: 'absolute',
            width: '20%',
            height: '20%',
            top: '40%',
            left: '40%',
            backgroundColor: '#000',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
