import { useEffect, useState } from 'react';
import api from '../services/api';

/** UI feature flags for the AI generator, with safe defaults before load. */
const DEFAULTS = { enprompt: true, aprvt: true, enable_nsfw: false, aupload: false };

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    let alive = true;
    api.get('/ai/images/settings')
      .then(({ data }) => {
        const flags = data?.data ?? data;
        if (alive && flags && typeof flags === 'object') setSettings({ ...DEFAULTS, ...flags });
      })
      .catch(() => { /* defaults are fine when the endpoint is unavailable */ });
    return () => { alive = false; };
  }, []);

  return settings;
}

export default useSettings;
