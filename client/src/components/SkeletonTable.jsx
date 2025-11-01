import React from 'react';

/**
 * SkeletonTable component
 * A skeleton placeholder for table loading states
 * 
 * @param {Object} props
 * @param {number} props.rows - Number of skeleton rows to show (default: 5)
 * @param {number} props.columns - Number of columns (default: 5)
 */
const SkeletonTable = ({ rows = 5, columns = 5 }) => {
  const baseStyle = {
    background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
    backgroundSize: '1000px 100%',
    borderRadius: '6px',
    animation: 'shimmer 2s infinite linear',
    height: '16px'
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index}>
                <div style={{ ...baseStyle, width: '80%', height: '18px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex}>
                  <div style={{ 
                    ...baseStyle, 
                    width: colIndex === 0 ? '90%' : colIndex === columns - 1 ? '60%' : '70%' 
                  }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SkeletonTable;
