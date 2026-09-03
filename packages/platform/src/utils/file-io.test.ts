import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DesktopBridge } from '@csf/desktop/bridge-contract';

import { openJsonFile, saveJsonFile } from './file-io';

const JSON_PICKER_TYPES = [
  { description: 'JSON', accept: { 'application/json': ['.json'] } },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('desktop bridge file I/O', () => {
  it('uses only the bridge to open a JSON file or return cancellation', async () => {
    const opened = { name: 'estate.json', text: '{"seal":2}' };
    const openBridge = vi.fn<DesktopBridge['openJsonFile']>().mockResolvedValueOnce(opened);
    const saveBridge = vi.fn<DesktopBridge['saveJsonFile']>();
    const browserOpen = vi.fn();
    const browserSave = vi.fn();
    vi.stubGlobal('window', {
      csfDesktop: { openJsonFile: openBridge, saveJsonFile: saveBridge },
      showOpenFilePicker: browserOpen,
      showSaveFilePicker: browserSave,
    });

    await expect(openJsonFile()).resolves.toEqual(opened);
    expect(openBridge).toHaveBeenCalledOnce();
    expect(browserOpen).not.toHaveBeenCalled();

    openBridge.mockResolvedValueOnce(null);
    await expect(openJsonFile()).resolves.toBeNull();
    expect(openBridge).toHaveBeenCalledTimes(2);
    expect(browserOpen).not.toHaveBeenCalled();
  });

  it('uses only the bridge to save the existing formatted JSON', async () => {
    const openBridge = vi.fn<DesktopBridge['openJsonFile']>();
    const saveBridge = vi.fn<DesktopBridge['saveJsonFile']>().mockResolvedValue();
    const browserOpen = vi.fn();
    const browserSave = vi.fn();
    vi.stubGlobal('window', {
      csfDesktop: { openJsonFile: openBridge, saveJsonFile: saveBridge },
      showOpenFilePicker: browserOpen,
      showSaveFilePicker: browserSave,
    });

    await saveJsonFile('estate.json', { seal: 2 });

    expect(saveBridge).toHaveBeenCalledWith({
      suggestedName: 'estate.json',
      text: '{\n  "seal": 2\n}',
    });
    expect(saveBridge).toHaveBeenCalledOnce();
    expect(browserSave).not.toHaveBeenCalled();
  });

  it('propagates a bridge rejection', async () => {
    const failure = new Error('native open failed');
    const openBridge = vi.fn<DesktopBridge['openJsonFile']>().mockRejectedValue(failure);
    const saveBridge = vi.fn<DesktopBridge['saveJsonFile']>();
    vi.stubGlobal('window', {
      csfDesktop: { openJsonFile: openBridge, saveJsonFile: saveBridge },
      showOpenFilePicker: vi.fn(),
      showSaveFilePicker: vi.fn(),
    });

    await expect(openJsonFile()).rejects.toBe(failure);
  });
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
