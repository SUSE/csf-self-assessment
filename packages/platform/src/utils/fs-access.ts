import type { DesktopBridge } from '@csf/desktop/bridge-contract';

// Ambient types for the File System Access API entry points. TS's DOM lib
// already declares FileSystemFileHandle and FileSystemWritableFileStream, but
// NOT the showOpen/showSaveFilePicker globals — declare only those, reusing
// the built-in handle types. A global-augmentation MODULE: file-io.ts imports
// it, so any program that compiles file-io.ts (either app's svelte-check,
// platform tsc) gets the declarations without tsconfig plumbing. Types only;
// no runtime; offline-safe.
export {};

declare global {
  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  interface ShowOpenFilePickerOptions {
    types?: FilePickerAcceptType[];
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
  }

  interface ShowSaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
  }

  interface Window {
    csfDesktop?: DesktopBridge;
    showOpenFilePicker?(
      options?: ShowOpenFilePickerOptions,
    ): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(
      options?: ShowSaveFilePickerOptions,
    ): Promise<FileSystemFileHandle>;
  }
}
