import React, { useState } from 'react';
import { FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function EmbedPreview({ stream }) {
  const [copied, setCopied] = useState(false);

  const origin = window.location.origin.replace(':3000', ':5000'); // dev: point to backend
  const scriptTag = `<script src="${origin}/embed.js" data-stream="${stream.embedCode}" data-layout="${stream.layout}" data-theme="${stream.theme}"></script>`;
  const divTag    = `<div data-code="${stream.embedCode}" data-layout="${stream.layout}" data-theme="${stream.theme}"></div>\n${scriptTag}`;

  const copy = () => {
    navigator.clipboard.writeText(divTag);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <p className="text-muted text-sm" style={{ marginBottom: 8 }}>
        Paste this on any website to embed your stream:
      </p>
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px 14px',
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.6,
        wordBreak: 'break-all',
        color: 'var(--text-muted)',
        position: 'relative',
      }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{divTag}</pre>
        <button
          onClick={copy}
          className="btn btn-icon btn-sm"
          style={{ position: 'absolute', top: 8, right: 8 }}
          title="Copy embed code"
        >
          {copied ? <FiCheck style={{ color: '#22c55e' }} /> : <FiCopy />}
        </button>
      </div>
      <p className="text-muted text-sm" style={{ marginTop: 8 }}>
        <FiExternalLink style={{ verticalAlign: 'middle', marginRight: 4 }} />
        The widget auto-loads posts from your connected accounts. No login required on the embedding site.
      </p>
    </div>
  );
}
