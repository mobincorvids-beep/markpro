import React from 'react';

/**
 * Catches render-time crashes anywhere below it so one broken module can never
 * blank out the whole application. Chunk-loading failures get a dedicated
 * message plus a reload action, since they are almost always fixed by
 * re-fetching the latest build.
 */
const isChunkError = (err) => {
  const msg = String((err && (err.message || err.name)) || '');
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk .* failed/i.test(msg) ||
    /Loading CSS chunk .* failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkError(error);

    return (
      <div className="loading-overlay" style={{ height: '80vh', flexDirection: 'column', gap: 14, textAlign: 'center', padding: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {chunk ? 'This page needs a refresh' : 'Something went wrong'}
        </h2>
        <p style={{ margin: 0, maxWidth: 460, fontSize: 13, opacity: 0.75 }}>
          {chunk
            ? 'A newer version of the app is available, so this screen could not finish loading. Reloading will pick it up.'
            : error.message || 'An unexpected error occurred while rendering this screen.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
