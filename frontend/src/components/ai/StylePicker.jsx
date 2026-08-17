import React from 'react';

const STYLES = [
  'none', 'photographic', 'cinematic', 'digital art', 'anime', 'comic book',
  'neon punk', '3d model', 'origami', 'line art', 'pixel art', 'watercolor',
];

/** Style presets appended to the prompt (Stable Diffusion models only). */
export default function StylePicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {STYLES.map(s => (
        <button
          key={s}
          type="button"
          className={`model-tab ${value === s ? 'active' : ''}`}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >{s === 'none' ? 'No style' : s}</button>
      ))}
    </div>
  );
}
