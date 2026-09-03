import { z } from 'zod';

import {
  DesktopSaveJsonInputSchema,
  type DesktopSaveJsonInput,
  type OpenedJsonFile,
} from './bridge-contract.js';
import {
  decideDesktopBridgeSender,
  type DesktopBridgeOwner,
  type DesktopBridgeSender,
} from './bridge-policy.js';

export class DesktopBridgeAccessError extends Error {
  override readonly name = 'DesktopBridgeAccessError';
}

export type NativeJsonFileService = {
  openJsonFile(): Promise<OpenedJsonFile | null>;
  saveJsonFile(input: DesktopSaveJsonInput): Promise<void>;
};

export type DesktopBridgeHandlers = {
  openJsonFile(
    sender: DesktopBridgeSender,
    payload: readonly unknown[],
  ): Promise<OpenedJsonFile | null>;
  saveJsonFile(
    sender: DesktopBridgeSender,
    payload: unknown,
  ): Promise<void>;
};

const OpenJsonPayloadSchema = z.tuple([]);

function requireAllowedSender(
  owner: DesktopBridgeOwner,
  sender: DesktopBridgeSender,
): void {
  const decision = decideDesktopBridgeSender(owner, sender);
  if (decision.kind === 'deny') {
    throw new DesktopBridgeAccessError(decision.reason);
  }
}

export function createDesktopBridgeHandlers(
  owner: DesktopBridgeOwner,
  files: NativeJsonFileService,
): DesktopBridgeHandlers {
  return {
    async openJsonFile(sender, payload) {
      requireAllowedSender(owner, sender);
      OpenJsonPayloadSchema.parse(payload);
      return files.openJsonFile();
    },
    async saveJsonFile(sender, payload) {
      requireAllowedSender(owner, sender);
      const input = DesktopSaveJsonInputSchema.parse(payload);
      await files.saveJsonFile(input);
    },
  };
}
