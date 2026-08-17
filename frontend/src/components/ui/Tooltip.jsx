/**
 * Tooltip wrapper (Tippy.js) with the app's look baked in.
 * Renders children untouched when no label is provided.
 */
import React from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export default function Tooltip({ label, placement = 'right', delay = 200, children }) {
  if (!label) return children;
  return (
    <Tippy content={label} placement={placement} delay={[delay, 0]} theme="markpro" arrow={false} offset={[0, 10]}>
      {children}
    </Tippy>
  );
}
