#!/usr/bin/env node
// Enforces spec invariant #7 ("Offline is absolute"): every built app HTML must
// make zero network requests. Run after `pnpm build` (wired into the `build`
// script). Exits non-zero — failing CI — if any external resource or
// un-inlined asset creeps into a built HTML file.
//
// It checks the *mechanisms* by which a browser actually fetches on load, not
// URL-shaped strings — bundled framework code legitimately embeds inert URLs
// (e.g. Svelte's "svelte.dev/e/…" error-message links, a Tailwind license
// comment) that are never requested. Scanning raw strings would false-positive
// on every real build. The three real fetch vectors:
//
//   1. Resource-loading elements (<script src>, <link>, <img>, media, …) whose
//      target is not inlined (data:) or in-document (#fragment). This doubles
//      as the single-file guarantee: no un-inlined asset may remain.
//   2. CSS url(…) / @import pointing at an external or protocol-relative target.
//   3. Explicit runtime network APIs called with a literal URL.
//
// (XML namespace URIs like xmlns="http://www.w3.org/2000/svg" are attributes,
// never fetched, and match none of the above — so inline SVG is safe.)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APPS_DIR = join(process.cwd(), 'apps');

// Recursively collect every built HTML file under apps/<app>/dist.
function findBuiltHtml(appsDir) {
  const out = [];
  let apps;
  try {
    apps = readdirSync(appsDir);
  } catch {
    return out;
  }
  for (const app of apps) {
    walk(join(appsDir, app, 'dist'), out);
  }
  return out;
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
}

const RESOURCE_ELEMENTS =
  /<(script|link|img|image|source|iframe|embed|object|audio|video|track)\b[^>]*?\s(src|href|data|srcset|poster)\s*=\s*(["'])(.*?)\3/gis;
const CSS_EXTERNAL_URL = /url\(\s*['"]?\s*(?:https?:|\/\/)/gi;
const CSS_IMPORT = /@import\s+(?:url\(\s*)?(['"])(.*?)\1/gi;
const RUNTIME_NETWORK =
  /(?:\b(?:fetch|importScripts)\s*\(\s*['"`](?:https?:|\/\/))|(?:new\s+(?:WebSocket|EventSource)\s*\(\s*['"`])|(?:\.sendBeacon\s*\(\s*['"`])/gi;

/** @returns {string[]} de-duplicated, human-readable violations for one file */
function violationsFor(html) {
  const problems = [];

  for (const m of html.matchAll(RESOURCE_ELEMENTS)) {
    const [, tag, attr, , rawValue] = m;
    const value = rawValue.trim();
    if (value === '' || value.startsWith('data:') || value.startsWith('#')) {
      continue;
    }
    problems.push(`<${tag} ${attr}="${value}"> — external or un-inlined asset`);
  }

  for (const m of html.matchAll(CSS_EXTERNAL_URL)) {
    problems.push(`css ${m[0].trim()}…) — external asset`);
  }

  for (const m of html.matchAll(CSS_IMPORT)) {
    const ref = m[2].trim();
    if (ref.startsWith('data:')) continue;
    problems.push(`css @import "${ref}" — external stylesheet`);
  }

  for (const m of html.matchAll(RUNTIME_NETWORK)) {
    problems.push(`runtime network call: ${m[0].trim()}…`);
  }

  return [...new Set(problems)];
}

const files = findBuiltHtml(APPS_DIR);

if (files.length === 0) {
  console.error(
    'check-offline: no built HTML found under apps/*/dist — run `pnpm build` first.',
  );
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const problems = violationsFor(readFileSync(file, 'utf8'));
  if (problems.length > 0) {
    failed = true;
    console.error(`\n✗ ${file}`);
    for (const p of problems) console.error(`    ${p}`);
  } else {
    console.log(`✓ ${file} — offline-clean`);
  }
}

if (failed) {
  console.error('\ncheck-offline: FAILED — built HTML is not offline-clean.');
  process.exit(1);
}
console.log(`\ncheck-offline: OK — ${files.length} file(s) offline-clean.`);
