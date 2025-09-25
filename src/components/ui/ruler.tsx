'use client';

import React, { useEffect, useState } from 'react';

/**
 * مكون المسطرة للاتجاه الأفقي أو الرأسي
 * يعرض علامات السنتيمتر بناءً على أبعاد ورقة A4
 * يحسب نسبة البكسل إلى السنتيمتر الدقيقة بناءً على حجم الصفحة المعروضة فعلياً
 */
const Ruler = ({ 
  orientation = 'horizontal', 
  isDarkMode,
  targetElement 
}: { 
  orientation?: 'horizontal' | 'vertical'; 
  isDarkMode?: boolean;
  targetElement?: HTMLElement | null;
}) => {
  const [pixelsPerCm, setPixelsPerCm] = useState(37.8); // قيمة احتياطية
  const [rulerLength, setRulerLength] = useState(0);
  
  // أبعاد A4 بالسنتيمتر
  const widthCm = 21;
  const heightCm = 29.7;

  useEffect(() => {
    // حساب البكسل لكل سنتيمتر الفعلي بناءً على حجم الصفحة المعروضة
    const calculatePixelsPerCm = () => {
      // البحث عن عنصر صفحة A4 للقياس
      const pageElement = targetElement || 
        document.querySelector('.page, .screenplay-container, .screenplay-pages-container, [style*="21cm"], [style*="210mm"]');
      
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect();
        
        if (orientation === 'horizontal') {
          // حساب بناءً على العرض المعروض الفعلي مقابل 21 سم
          const actualPixelsPerCm = rect.width / widthCm;
          setPixelsPerCm(actualPixelsPerCm);
          setRulerLength(rect.width);
        } else {
          // حساب بناءً على الارتفاع المعروض الفعلي مقابل 29.7 سم
          const actualPixelsPerCm = rect.height / heightCm;
          setPixelsPerCm(actualPixelsPerCm);
          setRulerLength(rect.height);
        }
      } else {
        // احتياطي: استخدام حساب مبني على العرض المرئي
        const viewportWidth = window.innerWidth;
        // افترض أن الصفحة تأخذ حوالي 80% من عرض العرض لـ A4
        const estimatedPageWidth = Math.min(viewportWidth * 0.8, 794); // 794px ≈ 21cm at 96dpi
        const estimatedPixelsPerCm = estimatedPageWidth / widthCm;
        setPixelsPerCm(estimatedPixelsPerCm);
        setRulerLength(estimatedPageWidth);
      }
    };

    // حساب عند التحميل وتغيير حجم النافذة
    calculatePixelsPerCm();
    window.addEventListener('resize', calculatePixelsPerCm);
    
    // إعادة حساب بعد تأخير قصير (للعناصر التي تحمل لاحقاً)
    const timer = setTimeout(calculatePixelsPerCm, 500);

    return () => {
      window.removeEventListener('resize', calculatePixelsPerCm);
      clearTimeout(timer);
    };
  }, [orientation, widthCm, heightCm, targetElement]);

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

  const rulerStyle: React.CSSProperties = orientation === 'horizontal' 
    ? {
        width: `${rulerLength}px`,
        height: '25px',
        top: '-30px',
        left: '0',
        right: 'auto'
      }
    : {
        height: `${rulerLength}px`,
        width: '25px',
        top: '0',
        right: '-30px',
        bottom: 'auto'
      };

  return (
    <div 
      className={`ruler-container ${orientation} ${isDarkMode ? 'dark' : ''}`}
      style={rulerStyle}
    >
      {numbers}
    </div>
  );
};

export default Ruler;