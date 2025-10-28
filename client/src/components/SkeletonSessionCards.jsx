import React from 'react';

/**
 * SkeletonSessionCards component
 * A skeleton placeholder for session card loading states
 * 
 * @param {Object} props
 * @param {number} props.count - Number of skeleton cards to show (default: 6)
 */
const SkeletonSessionCards = ({ count = 6 }) => {
  const baseStyle = {
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    animation: 'pulse 1.5s ease-in-out infinite'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, padding: 16 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            position: 'relative',
            background: '#ffffff',
            border: '1px solid #e1e5e9',
            borderRadius: 14,
            padding: 0,
            overflow: 'hidden'
          }}
        >
          {/* Colored left accent strip */}
          <div style={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: '#000000'
          }} />

          {/* Card content */}
          <div style={{ padding: '14px 16px 14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo placeholder */}
            <div style={{ 
              width: 52, 
              height: 52,
              minWidth: 52,
              borderRadius: 12, 
              backgroundColor: '#f0f0f0',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...baseStyle, height: '16px', width: '60%' }} />
              <div style={{ ...baseStyle, height: '14px', width: '40%' }} />
            </div>

            {/* Status badge placeholder */}
            <div style={{ ...baseStyle, height: '20px', width: '60px', borderRadius: '12px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonSessionCards;
