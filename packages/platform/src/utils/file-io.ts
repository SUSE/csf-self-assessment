import './fs-access';

// File I/O for the thin app shells (spec §3), shared by both apps. File System
// Access API when the browser has it (Chrome/Edge), <a download> / <input
// type=file> fallback (Firefox/Safari). Returns raw text on open — JSON.parse
// and schema validation are the app's + platform's job. No network of any kind.

const JSON_TYPES: FilePickerAcceptType[] = [
  { description: 'JSON', accept: { 'application/json': ['.json'] } },
];

export async function openJsonFile(): Promise<{ name: string; text: string } | null> {
  const bridge = window.csfDesktop;
  if (bridge) {
    return bridge.openJsonFile();
  }

  const picker = window.showOpenFilePicker;
  if (picker) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await picker({ types: JSON_TYPES, multiple: false });
    } catch {
      return null; // user cancelled the picker
    }
    const file = await handles[0].getFile();
    return { name: file.name, text: await file.text() };
  }
  // Fallback: hidden <input type=file>.
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then((text) => resolve({ name: file.name, text }));
    });
    input.click();
  });
}

export async function saveJsonFile(suggestedName: string, data: unknown): Promise<void> {
  const text = JSON.stringify(data, null, 2);
  const bridge = window.csfDesktop;
  if (bridge) {
    await bridge.saveJsonFile({ suggestedName, text });
    return;
  }

  const picker = window.showSaveFilePicker;
  if (picker) {
    let handle: FileSystemFileHandle;
    try {
      handle = await picker({ suggestedName, types: JSON_TYPES });
    } catch {
      return; // user cancelled the picker
    }
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return;
  }
  // Fallback: trigger a download.
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
