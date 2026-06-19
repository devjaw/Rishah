import { save as saveDialog, open as openDialog, message } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

export type SaveChoice = 'save' | 'discard' | 'cancel';

const TLDR_FILTERS = [{ name: 'TLDraw Files', extensions: ['tldr'] }];

export async function pickSavePath(defaultName = 'drawing'): Promise<string | null> {
  return saveDialog({
    defaultPath: `${defaultName}.tldr`,
    filters: TLDR_FILTERS,
  });
}

export async function pickOpenPath(): Promise<string | null> {
  const selected = await openDialog({ filters: TLDR_FILTERS, multiple: false });
  return typeof selected === 'string' ? selected : null;
}

export async function writeFile(path: string, body: string): Promise<void> {
  await writeTextFile(path, body);
}

export async function readFile(path: string): Promise<string> {
  return readTextFile(path);
}

export async function confirmSaveOrDiscard(messageText: string, title: string): Promise<SaveChoice> {
  const labels = { save: 'Save', discard: "Don't Save", cancel: 'Cancel' };
  const result = await message(messageText, {
    title,
    kind: 'warning',
    buttons: { yes: labels.save, no: labels.discard, cancel: labels.cancel },
  });
  if (result === labels.save) return 'save';
  if (result === labels.discard) return 'discard';
  return 'cancel';
}
