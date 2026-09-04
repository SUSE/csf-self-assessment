import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

import { SEAL_HUE_BRIDGE, tweakcnLivePreview } from './tweakcn-live-preview.mjs';

const ROOT = resolve(import.meta.dirname, '..');

function bridgeHarness() {
  let listener;
  const values = new Map();
  const parent = {};
  const context = {
    document: {
      documentElement: {
        style: {
          setProperty: (name, value) => values.set(name, value),
        },
      },
    },
    window: {
      parent,
      addEventListener: (type, next) => {
        assert.equal(type, 'message');
        listener = next;
      },
    },
  };

  vm.runInNewContext(SEAL_HUE_BRIDGE, context);
  assert.equal(typeof listener, 'function');

  return { listener, parent, values };
}

test('development plugin injects tweakcn before the repository token bridge', () => {
  const plugin = tweakcnLivePreview();
  const tags = plugin.transformIndexHtml();

  assert.equal(plugin.name, 'tweakcn-live-preview');
  assert.equal(plugin.apply, 'serve');
  assert.equal(tags.length, 2);
  assert.equal(tags[0].attrs.src, 'https://tweakcn.com/live-preview.min.js');
  assert.equal(tags[0].injectTo, 'head');
  assert.equal(tags[1].children, SEAL_HUE_BRIDGE);
  assert.equal(tags[1].injectTo, 'head');
});

test('live-preview updates derive SEAL hue from the light primary', () => {
  const { listener, parent, values } = bridgeHarness();

  listener({
    source: parent,
    data: {
      type: 'TWEAKCN_THEME_UPDATE',
      payload: {
        themeState: {
          styles: {
            light: { primary: 'oklch(0.6231 0.1880 259.8145)' },
          },
        },
      },
    },
  });

  assert.equal(values.get('--seal-hue'), '259.8145');
});

test('live-preview bridge ignores unrelated, untrusted, and malformed messages', () => {
  const { listener, parent, values } = bridgeHarness();
  const update = (source, type, primary) => listener({
    source,
    data: {
      type,
      payload: { themeState: { styles: { light: { primary } } } },
    },
  });

  update({}, 'TWEAKCN_THEME_UPDATE', 'oklch(0.6 0.2 280)');
  update(parent, 'OTHER_MESSAGE', 'oklch(0.6 0.2 280)');
  update(parent, 'TWEAKCN_THEME_UPDATE', 'hsl(280 50% 50%)');

  assert.equal(values.has('--seal-hue'), false);
});

test('both applications consume the shared development bridge', async () => {
  for (const app of ['author', 'assessment']) {
    const source = await readFile(resolve(ROOT, 'apps', app, 'vite.config.ts'), 'utf8');
    assert.match(source, /tools\/tweakcn-live-preview\.mjs/);
    assert.match(source, /tweakcnLivePreview\(\)/);
    assert.match(source, /livePreview/);
    assert.doesNotMatch(source, /live-preview\.min\.js/);
  }
});
