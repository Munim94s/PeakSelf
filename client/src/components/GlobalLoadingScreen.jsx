import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * GlobalLoadingScreen component
 * Shows full-screen loading until all page resources (images, CSS, etc.) are fully loaded
 */
const GlobalLoadingScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Show loading screen on route change
    setIsLoading(true);

    let timeoutId;
    let mutationObserver;
    const trackedImages = new Set();
    let checkTimeout;

    // Function to check if all current images are loaded
    const checkAllImagesLoaded = () => {
      const images = Array.from(document.images);

      // Track new images
      images.forEach(img => {
        if (!trackedImages.has(img)) {
          trackedImages.add(img);
        }
      });

      // Check if all tracked images are loaded
      const allLoaded = Array.from(trackedImages).every(
        img => img.complete && img.naturalHeight !== 0
      );

      return allLoaded && trackedImages.size > 0;
    };

    // Function to wait for images with retry mechanism
    const waitForImages = () => {
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }

      checkTimeout = setTimeout(() => {
        if (checkAllImagesLoaded()) {
          // All images loaded, wait a bit more to be safe
          setTimeout(() => {
            setIsLoading(false);
            if (mutationObserver) {
              mutationObserver.disconnect();
            }
          }, 200);
        } else {
          // Check again
          waitForImages();
        }
      }, 100);
    };

    // Set up MutationObserver to watch for new images
    mutationObserver = new MutationObserver(() => {
      waitForImages();
    });

    // Start observing after a delay to let React render
    timeoutId = setTimeout(() => {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });

      // Initial check
      waitForImages();
    }, 300);

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (checkTimeout) clearTimeout(checkTimeout);
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [location.pathname]);

  // Don't render anything if not loading
  if (!isLoading) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      gap: '2rem',
      zIndex: 10000,
      overflow: 'hidden'
    }}>
      {/* Peakium Logo */}
      <div style={{
        fontSize: '3rem',
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '-0.02em'
      }}>
        PEAKIUM
      </div>

      {/* Spinner using existing animations */}
      <div style={{
        position: 'relative',
        width: '80px',
        height: '80px'
      }}>
        {/* Outer rotating ring */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTop: '3px solid #fff',
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
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '2px solid #fff',
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
          backgroundColor: '#fff',
          borderRadius: '50%',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </div>
    </div>
  );
};

export default GlobalLoadingScreen;
