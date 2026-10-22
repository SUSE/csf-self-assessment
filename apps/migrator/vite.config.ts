import { existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Emits dist/migrator.html — the offline standalone deliverable
function emitAsMigratorHtml(): Plugin {
  return {
    name: 'emit-migrator-html',
    apply: 'build',
    closeBundle() {
      const from = fileURLToPath(new URL('./dist/index.html', import.meta.url));
      const to = fileURLToPath(new URL('./dist/migrator.html', import.meta.url));
      if (existsSync(from)) renameSync(from, to);
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), svelte({ inspector: true }), viteSingleFile(), emitAsMigratorHtml()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('../../packages/platform/src', import.meta.url)),
    },
  },
  server: { port: 5175, strictPort: true },
});
