import { save as saveDialog, open as openDialog, ask } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

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

export async function confirmSavePrompt(messageText: string, title: string): Promise<boolean> {
  return ask(messageText, { title, kind: 'warning' });
}
