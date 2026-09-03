import { contextBridge, ipcRenderer } from 'electron';

import {
  DESKTOP_BRIDGE_KEY,
  DesktopSaveJsonInputSchema,
  OPEN_JSON_CHANNEL,
  OpenedJsonFileSchema,
  SAVE_JSON_CHANNEL,
  type DesktopBridge,
} from './bridge-contract.js';

contextBridge.exposeInMainWorld(
  DESKTOP_BRIDGE_KEY,
  Object.freeze({
    async openJsonFile() {
      return OpenedJsonFileSchema.nullable().parse(
        await ipcRenderer.invoke(OPEN_JSON_CHANNEL),
      );
    },
    async saveJsonFile(input) {
      const parsed = DesktopSaveJsonInputSchema.parse(input);
      await ipcRenderer.invoke(SAVE_JSON_CHANNEL, parsed);
    },
  }) satisfies DesktopBridge,
);
