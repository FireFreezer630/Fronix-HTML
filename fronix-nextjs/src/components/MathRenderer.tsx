'use client';

import React, { useEffect } from 'react';
// @ts-ignore: This module typically runs in a browser context and extends the global window object
import renderMathInElement from 'katex/dist/contrib/auto-render';

const MathRenderer: React.FC = () => {
  useEffect(() => {
    if (document.body && (window as any).renderMathInElement) {
      // Ensure renderMathInElement is available on window, which auto-render usually does
      (window as any).renderMathInElement(document.body);
    } else if (document.body) {
        // Fallback if renderMathInElement isn't globally available (e.g., in a non-global context)
        renderMathInElement(document.body, {
          // Katex options can be configured here
          delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false
        });
    }
  }, []);

  return null; // This component doesn't render any visible JSX itself
};

export default MathRenderer;
