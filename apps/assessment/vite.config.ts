import { existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { tweakcnLivePreview } from '../../tools/tweakcn-live-preview.mjs';

const livePreview = tweakcnLivePreview() as Plugin;

// The entry is the conventional `index.html`, so the Vite dev server serves the
// app at `/`. For the production build we rename the emitted single file to
// `assessment.html` — the offline deliverable name.
function emitAsAssessmentHtml(): Plugin {
  return {
    name: 'emit-assessment-html',
    apply: 'build',
    closeBundle() {
      const from = fileURLToPath(new URL('./dist/index.html', import.meta.url));
      const to = fileURLToPath(new URL('./dist/assessment.html', import.meta.url));
      if (existsSync(from)) renameSync(from, to);
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), svelte({ inspector: true }), viteSingleFile(), emitAsAssessmentHtml(), livePreview],
  // `$lib` is the shadcn-svelte CLI's import alias (see tsconfig.base.json).
  // Mirrored here so a freshly scaffolded platform component builds as-is.
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('../../packages/platform/src', import.meta.url)),
    },
  },

  server: { port: 5174, strictPort: true },
});
