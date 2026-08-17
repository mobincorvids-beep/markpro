import React, { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CopyButton({ text, className = 'btn btn-sm btn-secondary' }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  const copy = () => {
    navigator.clipboard.writeText(text);
    setDone(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button className={className} onClick={copy}>
      {done ? <FiCheck size={13} style={{ color: 'var(--green)' }} /> : <FiCopy size={13} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}
