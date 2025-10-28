import React from 'react';

/**
 * SkeletonGrid component
 * A skeleton placeholder for card grid loading states
 * 
 * @param {Object} props
 * @param {number} props.cards - Number of skeleton cards to show (default: 8)
 * @param {string} props.type - Type of card: 'stat' | 'content' (default: 'stat')
 */
const SkeletonGrid = ({ cards = 8, type = 'stat' }) => {
  const baseStyle = {
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite'
  };

  if (type === 'content') {
    return (
      <div className="card-grid">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="content-card" style={{ minHeight: '150px' }}>
            <div style={{ ...baseStyle, height: '24px', width: '80%', marginBottom: '12px' }} />
            <div style={{ ...baseStyle, height: '16px', width: '100%', marginBottom: '8px' }} />
            <div style={{ ...baseStyle, height: '16px', width: '90%', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ ...baseStyle, height: '32px', width: '60px' }} />
              <div style={{ ...baseStyle, height: '32px', width: '70px' }} />
              <div style={{ ...baseStyle, height: '32px', width: '60px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: stat cards
  return (
    <div className="card-grid">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} style={{
          border: '1px solid #d0d0d0',
          borderRadius: 12,
          padding: '1.25rem',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ ...baseStyle, width: '60%', height: '14px' }} />
            <div style={{ ...baseStyle, width: '20px', height: '20px', borderRadius: '50%' }} />
          </div>
          <div style={{ ...baseStyle, height: '28px', width: '50%', marginBottom: '8px' }} />
          <div style={{ ...baseStyle, height: '12px', width: '40%' }} />
        </div>
      ))}
    </div>
  );
};

export default SkeletonGrid;
