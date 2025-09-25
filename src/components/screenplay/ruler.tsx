import React from 'react';

const PIXELS_PER_CM = 37.8; // تقريب لـ 96 DPI

interface RulerProps {
  orientation?: 'horizontal' | 'vertical';
  isDarkMode?: boolean;
}

const Ruler: React.FC<RulerProps> = ({ orientation = 'horizontal', isDarkMode = false }) => {
  const length = orientation === 'horizontal' ? 1000 : 1123;
  const lengthInCm = Math.floor(length / PIXELS_PER_CM);
  const numbers = [];

  for (let i = 1; i <= lengthInCm; i++) {
    const style = orientation === 'horizontal'
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