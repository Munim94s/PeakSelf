import React from 'react';
import SkeletonCard from './SkeletonCard';

/**
 * SkeletonList component
 * Displays multiple skeleton cards for list loading states
 * 
 * @param {Object} props
 * @param {number} props.count - Number of skeleton cards to show (default: 6)
 * @param {boolean} props.featured - Whether to include a featured card
 */
const SkeletonList = ({ count = 6, featured = false }) => {
  return (
    <>
      {featured && <SkeletonCard featured />}
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem',
        marginTop: featured ? '2rem' : 0
      }}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </>
  );
};

export default SkeletonList;
