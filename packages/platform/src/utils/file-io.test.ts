import { afterEach, describe, expect, it, vi } from 'vitest';

import { openJsonFile, saveJsonFile } from './file-io';

const JSON_PICKER_TYPES = [
  { description: 'JSON', accept: { 'application/json': ['.json'] } },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('browser file I/O', () => {
  it('keeps the open picker options and exact file result', async () => {
    let options: ShowOpenFilePickerOptions | undefined;
    const browserOpen = vi.fn(async (input?: ShowOpenFilePickerOptions) => {
      options = input;
      return [
        {
          async getFile() {
            return new File(['{"browser":true}'], 'estate.json', {
              type: 'application/json',
            });
          },
        },
      ];
    });
    vi.stubGlobal('window', { showOpenFilePicker: browserOpen });

    await expect(openJsonFile()).resolves.toEqual({
      name: 'estate.json',
      text: '{"browser":true}',
    });
    expect(options).toEqual({ types: JSON_PICKER_TYPES, multiple: false });
    expect(browserOpen).toHaveBeenCalledOnce();
  });

  it('keeps the save picker options, formatted write, and one close', async () => {
    let options: ShowSaveFilePickerOptions | undefined;
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const browserSave = vi.fn(async (input?: ShowSaveFilePickerOptions) => {
      options = input;
      return {
        async createWritable() {
          return { write, close };
        },
      };
    });
    vi.stubGlobal('window', { showSaveFilePicker: browserSave });

    await saveJsonFile('estate.json', { seal: 2 });

    expect(options).toEqual({ suggestedName: 'estate.json', types: JSON_PICKER_TYPES });
    expect(write).toHaveBeenCalledWith('{\n  "seal": 2\n}');
    expect(write).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps picker cancellation as null or a no-op', async () => {
    const browserOpen = vi.fn().mockRejectedValue(new Error('cancelled'));
    const browserSave = vi.fn().mockRejectedValue(new Error('cancelled'));
    vi.stubGlobal('window', {
      showOpenFilePicker: browserOpen,
      showSaveFilePicker: browserSave,
    });

    await expect(openJsonFile()).resolves.toBeNull();
    await expect(saveJsonFile('estate.json', { seal: 2 })).resolves.toBeUndefined();
  });
});
