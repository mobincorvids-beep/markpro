import React, { useMemo, useState } from 'react';

/**
 * Masonry column-count slider (replaces the legacy #myRange input).
 *
 * `useColumnSlider` returns the count, its setter, and a ready-to-spread
 * CSS grid style so gallery pages stay purely presentational.
 */
export function useColumnSlider(initial = 4) {
  const [cols, setCols] = useState(initial);
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  }), [cols]);
  return [cols, setCols, gridStyle];
}

export default function ColumnSlider({ value, onChange, min = 1, max = 6 }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
        {value} cols
      </span>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Gallery columns"
        style={{ width: '100%', accentColor: 'var(--brand)' }}
      />
    </label>
  );
}
