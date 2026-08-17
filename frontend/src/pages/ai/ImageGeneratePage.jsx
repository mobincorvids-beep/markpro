import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useImageGeneration } from '../../hooks/useImageGeneration';
import ModelSelector, { isDalleModel, MODEL_META } from '../../components/ai/ModelSelector';
import SizeSelector from '../../components/ai/SizeSelector';
import StylePicker from '../../components/ai/StylePicker';

/**
 * GeneratePage
 * Fully refactored using shared hooks and components.
 * Mirrors the behaviour of king-submitai.php + king-leo.js AJAX flow:
 *  - Prompt bar with model selector
 *  - Size radio group (aisize)
 *  - Style radio grid (aistyle) - SD models only
 *  - Negative prompt textarea - shown when enprompt setting enabled
 *  - Count selector (1-4)
 *  - Results grid with Download + Save actions
 *  - Private / NSFW checkboxes on save (mirrors aprvt / nsfw flags)
 */
export default function GeneratePage() {
  const settings = useSettings();

  // Form state
  const [prompt,    setPrompt]    = useState('');
  const [negPrompt, setNegPrompt] = useState('');
  const [aiModel,   setAiModel]   = useState('sd');
  const [size,      setSize]      = useState('1024x1024');
  const [style,     setStyle]     = useState('none');
  const [count,     setCount]     = useState(1);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isNsfw,    setIsNsfw]    = useState(false);

  const isDalle = isDalleModel(aiModel);

  // Switch back to square when swapping between SD ↔ DALL-E
  const handleModelChange = (m) => {
    setAiModel(m);
    setSize('1024x1024');
    if (isDalleModel(m)) setStyle('none');
  };

  const { results, loading, savedSet, generate, saveToGallery, downloadImage } = useImageGeneration();

  const handleGenerate = () =>
    generate({ prompt, aiModel, size, style, negPrompt, count });

  const handleSave = (idx) =>
    saveToGallery(idx, { prompt, aiModel, size, style, negPrompt, isPrivate, isNsfw });

  return (
    <div className="generate-page container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Generate Images</h1>
      </div>

      {/* ── Prompt bar ── */}
      <div className="ai-prompt-bar">
        <input
          id="ai-box"
          type="text"
          placeholder="Describe your image in detail…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
          disabled={loading}
          autoFocus
        />

        {/* Count selector */}
        <select
          id="ai-count"
          className="form-control"
          style={{ width: 'auto', padding: '0.4rem 0.65rem', flexShrink: 0 }}
          value={count}
          onChange={e => setCount(parseInt(e.target.value))}
          disabled={loading || (isDalle && aiModel === 'de3')}
          title={isDalle && aiModel === 'de3' ? 'DALL-E 3 supports 1 image at a time' : 'Number of images'}
        >
          {[1, 2, 3, 4].map(n => (
            <option key={n} value={n}>{n} image{n > 1 ? 's' : ''}</option>
          ))}
        </select>

        <button
          id="ai-submit"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{ flexShrink: 0 }}
        >
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="loader-spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
                Generating…
              </span>
            : 'Generate'}
        </button>
      </div>

      {/* ── Model tabs ── */}
      <div className="mb-2">
        <ModelSelector value={aiModel} onChange={handleModelChange} />
      </div>

      {/* ── Size selector ── */}
      <div className="mb-2">
        <SizeSelector value={size} onChange={setSize} isDalle={isDalle} />
      </div>

      {/* ── Style picker (SD models only) ── */}
      {!isDalle && (
        <div className="mb-2">
          <StylePicker value={style} onChange={setStyle} />
        </div>
      )}

      {/* ── Negative prompt (when enabled in admin settings) ── */}
      {settings.enprompt && (
        <div className="form-group">
          <label htmlFor="n_prompt">Negative Prompt <span className="text-muted text-sm">(what to avoid)</span></label>
          <textarea
            id="n_prompt"
            className="form-control"
            rows={2}
            placeholder="blurry, low quality, watermark, text, cropped…"
            value={negPrompt}
            onChange={e => setNegPrompt(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      {/* ── Save options (private / NSFW) ── */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {settings.aprvt && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text2)' }}>
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
 Save as Private
          </label>
        )}
        {settings.enable_nsfw && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text2)' }}>
            <input type="checkbox" checked={isNsfw} onChange={e => setIsNsfw(e.target.checked)} />
 Mark as NSFW
          </label>
        )}
      </div>

      {/* ── Loading spinner ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="loader-spinner" style={{ margin: '0 auto' }} />
          <p className="text-muted text-sm" style={{ marginTop: '1rem' }}>
            Generating with {MODEL_META[aiModel]?.label || aiModel}…
          </p>
        </div>
      )}

      {/* ── Results grid ── */}
      {!loading && results.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1.5rem 0 0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
              {results.length} image{results.length > 1 ? 's' : ''} generated
            </h2>
            {settings.aupload && (
              <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                Auto-saved to gallery
              </span>
            )}
          </div>

          <div className="results-grid" id="ai-results">
            {results.map((item, idx) => (
              <div className="result-card" key={idx}>
                <img
                  src={item.format === 'bas' ? `data:image/png;base64,${item.src}` : item.src}
                  alt={`result-${idx}`}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />

                {/* Result meta bar - mirrors ai-result-up from king-leo.js */}
                <div style={{
                  display: 'flex', gap: '0.4rem', padding: '0.5rem 0.6rem',
                  background: 'var(--bg3)', flexWrap: 'wrap',
                }}>
                  <span className="badge badge-purple">{MODEL_META[aiModel]?.label || aiModel}</span>
                  <span className="badge badge-green">{size}</span>
                  {style !== 'none' && <span className="badge badge-purple">{style}</span>}
                </div>

                <div className="result-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => downloadImage(idx)}
                    title="Download image"
                  >
 Download
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSave(idx)}
                    disabled={savedSet[idx]}
                    title={savedSet[idx] ? 'Saved to gallery' : 'Save to gallery'}
                  >
                    {savedSet[idx] ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && results.length === 0 && (
        <div className="empty-state" style={{ paddingTop: '4rem' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}></span>
          <p style={{ fontSize: '1rem', color: 'var(--text2)' }}>
            Enter a prompt above and hit Generate to create images
          </p>
        </div>
      )}
    </div>
  );
}
