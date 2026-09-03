import type { DesktopTarget } from './target.js';

export type DesktopBridgeOwner = {
  webContentsId: number;
  startUrl: DesktopTarget['startUrl'];
};

export type DesktopBridgeSender = {
  webContentsId: number;
  frameUrl: string;
  frameKind: 'main' | 'subframe' | 'missing';
};

export type DesktopBridgeSenderDecision =
  | { kind: 'allow' }
  | {
      kind: 'deny';
      reason: 'wrong-web-contents' | 'wrong-frame' | 'wrong-url';
    };

export function decideDesktopBridgeSender(
  owner: DesktopBridgeOwner,
  sender: DesktopBridgeSender,
): DesktopBridgeSenderDecision {
  if (sender.webContentsId !== owner.webContentsId) {
    return { kind: 'deny', reason: 'wrong-web-contents' };
  }
  if (sender.frameKind !== 'main') {
    return { kind: 'deny', reason: 'wrong-frame' };
  }
  if (sender.frameUrl !== owner.startUrl) {
    return { kind: 'deny', reason: 'wrong-url' };
  }
  return { kind: 'allow' };
}
