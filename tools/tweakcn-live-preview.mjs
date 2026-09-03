const LIVE_PREVIEW_URL = 'https://tweakcn.com/live-preview.min.js';

export const SEAL_HUE_BRIDGE = `(() => {
  const THEME_UPDATE = 'TWEAKCN_THEME_UPDATE';
  const OKLCH_HUE = /^oklch\\(\\s*[^\\s/]+\\s+[^\\s/]+\\s+([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))(?:deg)?(?:\\s*\\/\\s*[^)]+)?\\s*\\)$/i;

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.data?.type !== THEME_UPDATE) return;

    const primary = event.data?.payload?.themeState?.styles?.light?.primary;
    if (typeof primary !== 'string') return;

    const hue = OKLCH_HUE.exec(primary.trim())?.[1];
    if (hue) document.documentElement.style.setProperty('--seal-hue', hue);
  });
})();`;

/**
 * Add tweakcn's development-only live-preview client and bridge the repository's
 * custom SEAL hue from the same light primary value used by the palette bridge.
 */
export function tweakcnLivePreview() {
  return {
    name: 'tweakcn-live-preview',
    apply: 'serve',
    transformIndexHtml: () => [
      {
        tag: 'script',
        attrs: { src: LIVE_PREVIEW_URL },
        injectTo: 'head',
      },
      {
        tag: 'script',
        children: SEAL_HUE_BRIDGE,
        injectTo: 'head',
      },
    ],
  };
}
