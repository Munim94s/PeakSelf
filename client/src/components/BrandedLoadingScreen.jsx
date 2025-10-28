import React from 'react';

/**
 * BrandedLoadingScreen component
 * Full-screen loading with PEAKSELF branding and spinner
 * Used for admin page lazy loading
 */
const BrandedLoadingScreen = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000',
      gap: '2rem'
    }}>
      {/* PeakSelf Logo */}
      <div style={{
        fontSize: '3rem',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '-0.02em'
      }}>
        PEAKSELF
      </div>
      
      {/* Spinner */}
      <div style={{
        position: 'relative',
        width: '60px',
        height: '60px'
      }}>
        {/* Outer rotating ring */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTop: '4px solid #fff',
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
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '3px solid #fff',
          borderRadius: '50%',
          animation: 'spin-reverse 1s cubic-bezier(0.5, 0, 0.5, 1) infinite'
        }} />
      </div>
    </div>
  );
};

export default BrandedLoadingScreen;
