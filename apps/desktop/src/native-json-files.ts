import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { dialog, type BrowserWindow } from 'electron';
import { z } from 'zod';

import {
  DesktopJsonFileNameSchema,
  DesktopJsonTextSchema,
  DesktopSaveJsonInputSchema,
  MAX_JSON_FILE_BYTES,
  type OpenedJsonFile,
} from './bridge-contract.js';
import type { NativeJsonFileService } from './bridge-handlers.js';

const SelectedFilePathsSchema = z.tuple([z.string()]);
const SelectedSavePathSchema = z.string().min(1);
const JSON_FILTER = [{ name: 'JSON', extensions: ['json'] }];

export function createNativeJsonFileService(
  ownerWindow: BrowserWindow,
): NativeJsonFileService {
  return {
    async openJsonFile(): Promise<OpenedJsonFile | null> {
      const result = await dialog.showOpenDialog(ownerWindow, {
        filters: JSON_FILTER,
        properties: ['openFile'],
      });
      if (result.canceled) {
        return null;
      }

      const [filePath] = SelectedFilePathsSchema.parse(result.filePaths);
      const name = DesktopJsonFileNameSchema.parse(basename(filePath));
      const fileStats = await stat(filePath);
      if (fileStats.size > MAX_JSON_FILE_BYTES) {
        throw new Error('JSON file exceeds 8 MiB');
      }
      const text = DesktopJsonTextSchema.parse(await readFile(filePath, 'utf8'));
      return { name, text };
    },
    async saveJsonFile(input): Promise<void> {
      const parsed = DesktopSaveJsonInputSchema.parse(input);
      const result = await dialog.showSaveDialog(ownerWindow, {
        defaultPath: parsed.suggestedName,
        filters: JSON_FILTER,
      });
      if (result.canceled) {
        return;
      }

      const filePath = SelectedSavePathSchema.parse(result.filePath);
      await writeFile(filePath, parsed.text, 'utf8');
    },
  };
}
