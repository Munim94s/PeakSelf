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
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    animation: 'pulse 1.5s ease-in-out infinite',
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
