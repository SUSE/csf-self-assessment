import { z } from 'zod';

export const DESKTOP_BRIDGE_KEY = 'csfDesktop';
export const OPEN_JSON_CHANNEL = 'csf:desktop:open-json';
export const SAVE_JSON_CHANNEL = 'csf:desktop:save-json';
export const MAX_JSON_FILE_BYTES = 8_388_608;

export const DesktopJsonFileNameSchema = z
  .string()
  .min(6)
  .regex(/^[^/\\\0]+\.json$/i, 'Expected one JSON filename without a path')
  .refine(
    (name) => new TextEncoder().encode(name).byteLength <= 255,
    'JSON filename exceeds 255 bytes',
  );
export const DesktopJsonTextSchema = z
  .string()
  .refine(
    (text) => new TextEncoder().encode(text).byteLength <= MAX_JSON_FILE_BYTES,
    'JSON text exceeds 8 MiB',
  );
export const OpenedJsonFileSchema = z
  .object({ name: DesktopJsonFileNameSchema, text: DesktopJsonTextSchema })
  .strict();
export const DesktopSaveJsonInputSchema = z
  .object({ suggestedName: DesktopJsonFileNameSchema, text: DesktopJsonTextSchema })
  .strict();

export type OpenedJsonFile = z.infer<typeof OpenedJsonFileSchema>;
export type DesktopSaveJsonInput = z.infer<typeof DesktopSaveJsonInputSchema>;

export type DesktopBridge = {
  openJsonFile(): Promise<OpenedJsonFile | null>;
  saveJsonFile(input: DesktopSaveJsonInput): Promise<void>;
};
