import React from 'react';

const SD_SIZES    = ['512x512', '768x768', '1024x1024', '832x1216', '1216x832'];
const DALLE_SIZES = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];

/** Aspect/resolution picker; the option list depends on the model family. */
export default function SizeSelector({ value, onChange, isDalle }) {
  const sizes = isDalle ? DALLE_SIZES : SD_SIZES;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {sizes.map(s => (
        <button
          key={s}
          type="button"
          className={`model-tab ${value === s ? 'active' : ''}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >{s}</button>
      ))}
    </div>
  );
}
