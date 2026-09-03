import { z } from 'zod';
import { DesktopSaveJsonInputSchema, } from './bridge-contract.js';
import { decideDesktopBridgeSender, } from './bridge-policy.js';
export class DesktopBridgeAccessError extends Error {
    name = 'DesktopBridgeAccessError';
}
const OpenJsonPayloadSchema = z.tuple([]);
function requireAllowedSender(owner, sender) {
    const decision = decideDesktopBridgeSender(owner, sender);
    if (decision.kind === 'deny') {
        throw new DesktopBridgeAccessError(decision.reason);
    }
}
export function createDesktopBridgeHandlers(owner, files) {
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
