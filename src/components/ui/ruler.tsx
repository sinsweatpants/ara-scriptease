'use client';

import React from 'react';

// Standard DPI conversion: 96 pixels per inch / 2.54 cm per inch
const PIXELS_PER_CM = 96 / 2.54;

/**
 * A ruler component for horizontal or vertical orientation.
 * It displays centimeter markings based on A4 paper dimensions.
 */
const Ruler = ({ orientation = 'horizontal', isDarkMode }: { orientation?: 'horizontal' | 'vertical'; isDarkMode?: boolean }) => {
  // A4 dimensions in cm
  const widthCm = 21;
  const heightCm = 29.7;

  const lengthInCm = Math.floor(orientation === 'horizontal' ? widthCm : heightCm);
  
  const numbers = [];
  for (let i = 1; i <= lengthInCm; i++) {
    const style: React.CSSProperties =
      orientation === 'horizontal'
        ? { right: `${i * PIXELS_PER_CM}px`, transform: 'translateX(50%)' }
        : { top: `${i * PIXELS_PER_CM}px`, transform: 'translateY(-50%)' };
    
    numbers.push(
      <span key={i} className="ruler-number" style={style}>
        {i}
      </span>
    );
  }

  return (
    <div className={`ruler-container ${orientation} ${isDarkMode ? 'dark' : ''}`}>
      {numbers}
    </div>
  );
};

export default Ruler;
