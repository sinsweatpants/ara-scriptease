'use client';

import React, { useEffect, useState } from 'react';

/**
 * A ruler component for horizontal or vertical orientation.
 * It displays centimeter markings based on A4 paper dimensions.
 * Calculates precise pixel-to-cm ratio based on actual displayed page size.
 */
const Ruler = ({ orientation = 'horizontal', isDarkMode }: { orientation?: 'horizontal' | 'vertical'; isDarkMode?: boolean }) => {
  const [pixelsPerCm, setPixelsPerCm] = useState(37.8); // fallback value
  
  // A4 dimensions in cm
  const widthCm = 21;
  const heightCm = 29.7;

  useEffect(() => {
    // Calculate actual pixels per cm based on displayed page size
    const calculatePixelsPerCm = () => {
      // Look for any A4 page element to measure
      const pageElement = document.querySelector('.page, .screenplay-container, [style*="21cm"], [style*="210mm"]');
      
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect();
        
        if (orientation === 'horizontal') {
          // Calculate based on actual displayed width vs 21cm
          const actualPixelsPerCm = rect.width / widthCm;
          setPixelsPerCm(actualPixelsPerCm);
        } else {
          // Calculate based on actual displayed height vs 29.7cm
          const actualPixelsPerCm = rect.height / heightCm;
          setPixelsPerCm(actualPixelsPerCm);
        }
      } else {
        // Fallback: use viewport-based calculation
        const viewportWidth = window.innerWidth;
        // Assume page takes about 80% of viewport width for A4
        const estimatedPageWidth = Math.min(viewportWidth * 0.8, 794); // 794px ≈ 21cm at 96dpi
        const estimatedPixelsPerCm = estimatedPageWidth / widthCm;
        setPixelsPerCm(estimatedPixelsPerCm);
      }
    };

    // Calculate on mount and window resize
    calculatePixelsPerCm();
    window.addEventListener('resize', calculatePixelsPerCm);
    
    // Also recalculate after a short delay (for elements that load later)
    const timer = setTimeout(calculatePixelsPerCm, 500);

    return () => {
      window.removeEventListener('resize', calculatePixelsPerCm);
      clearTimeout(timer);
    };
  }, [orientation, widthCm, heightCm]);

  const lengthInCm = Math.floor(orientation === 'horizontal' ? widthCm : heightCm);
  
  const numbers = [];
  for (let i = 1; i <= lengthInCm; i++) {
    const positionPx = i * pixelsPerCm;
    const style: React.CSSProperties =
      orientation === 'horizontal'
        ? { right: `${positionPx}px`, transform: 'translateX(50%)' }
        : { top: `${positionPx}px`, transform: 'translateY(-50%)' };
    
    numbers.push(
      <span key={i} className="ruler-number" style={style}>
        {i}
      </span>
    );
  }

  return (
    <div 
      className={`ruler-container ${orientation} ${isDarkMode ? 'dark' : ''}`}
      style={{
        [orientation === 'horizontal' ? 'width' : 'height']: `${lengthInCm * pixelsPerCm}px`
      }}
    >
      {numbers}
    </div>
  );
};

export default Ruler;
