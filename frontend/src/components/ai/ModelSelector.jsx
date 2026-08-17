import React from 'react';

/** Model catalogue shared by the generator UI and its result badges. */
export const MODEL_META = {
  sd:     { label: 'Stable Diffusion', family: 'sd' },
  realxl: { label: 'RealVis XL',       family: 'sd' },
  odalle: { label: 'Open DALL-E',      family: 'sd' },
  pix:    { label: 'Pixel Art',        family: 'sd' },
  dreams: { label: 'Dreamshaper',      family: 'sd' },
  playg:  { label: 'Playground',       family: 'sd' },
  de:     { label: 'DALL·E 2',         family: 'dalle' },
  de3:    { label: 'DALL·E 3',         family: 'dalle' },
};

export const isDalleModel = (m) => MODEL_META[m]?.family === 'dalle';

export default function ModelSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(MODEL_META).map(([key, meta]) => (
        <button
          key={key}
          type="button"
          className={`model-tab ${value === key ? 'active' : ''}`}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >{meta.label}</button>
      ))}
    </div>
  );
}
