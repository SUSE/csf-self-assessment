import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Node 26 supports type stripping for TypeScript files natively, but ESM resolution
// requires explicit file extensions. This hook allows extensionless relative imports
// (like `import './primitives'`) to resolve to `.ts` or `/index.ts` files.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        const resolved = new URL(specifier, context.parentURL);
        const filePath = fileURLToPath(resolved);
        if (existsSync(filePath + '.ts')) {
          return nextResolve(pathToFileURL(filePath + '.ts').href, context);
        }
        if (existsSync(filePath + '/index.ts')) {
          return nextResolve(pathToFileURL(filePath + '/index.ts').href, context);
        }
      }
      throw err;
    }
  },
});
