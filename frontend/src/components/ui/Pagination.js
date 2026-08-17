export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const items = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(pages, page + 2);
  if (start > 1) { items.push(1); if (start > 2) items.push('...'); }
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pages) { if (end < pages - 1) items.push('...'); items.push(pages); }

  return (
    <div className="pagination">
      <button className="btn btn-outline btn-xs" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {items.map((item, i) =>
        item === '...'
          ? <span key={`e${i}`} style={{ color: 'var(--text2)', padding: '0 4px' }}>…</span>
          : <button key={item} className={`btn btn-xs ${item === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => onChange(item)}>{item}</button>
      )}
      <button className="btn btn-outline btn-xs" disabled={page >= pages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
