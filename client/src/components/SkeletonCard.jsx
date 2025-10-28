import React from 'react';

/**
 * SkeletonCard component
 * A skeleton placeholder for card/post loading states
 * 
 * @param {Object} props
 * @param {boolean} props.featured - Whether this is a featured card (larger)
 */
const SkeletonCard = ({ featured = false }) => {
  const baseStyle = {
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite'
  };

  if (featured) {
    return (
      <article style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        padding: '2rem',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: '#fff',
        marginBottom: '2rem'
      }}>
        {/* Featured image skeleton */}
        <div style={{
          ...baseStyle,
          height: '300px',
          width: '100%'
        }} />
        
        {/* Featured content skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...baseStyle, height: '24px', width: '80px' }} />
          <div style={{ ...baseStyle, height: '36px', width: '90%' }} />
          <div style={{ ...baseStyle, height: '20px', width: '100%' }} />
          <div style={{ ...baseStyle, height: '20px', width: '95%' }} />
          <div style={{ ...baseStyle, height: '20px', width: '85%' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <div style={{ ...baseStyle, height: '28px', width: '60px' }} />
            <div style={{ ...baseStyle, height: '28px', width: '70px' }} />
          </div>
          <div style={{ ...baseStyle, height: '40px', width: '120px', marginTop: 'auto' }} />
        </div>
      </article>
    );
  }

  return (
    <article style={{
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      transition: 'transform 0.2s'
    }}>
      {/* Image skeleton */}
      <div style={{
        ...baseStyle,
        height: '200px',
        width: '100%'
      }} />
      
      {/* Content skeleton */}
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ ...baseStyle, height: '20px', width: '70px' }} />
        <div style={{ ...baseStyle, height: '28px', width: '90%' }} />
        <div style={{ ...baseStyle, height: '18px', width: '100%' }} />
        <div style={{ ...baseStyle, height: '18px', width: '95%' }} />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ ...baseStyle, height: '24px', width: '50px' }} />
          <div style={{ ...baseStyle, height: '24px', width: '60px' }} />
        </div>
      </div>
    </article>
  );
};

export default SkeletonCard;
