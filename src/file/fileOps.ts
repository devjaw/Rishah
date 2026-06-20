import { Editor, hardReset, parseTldrawJsonFile, createTLSchema } from 'tldraw';
import { currentFilePath, savedSnapshot } from './fileState';
import { serializeEditor, comparableSnapshot, isDirty } from './serialize';
import {
  pickSavePath,
  pickOpenPath,
  writeFile,
  readFile,
  confirmSaveOrDiscard,
  type SaveChoice,
} from './fileIO';

export type Feedback = {
  success: (msg: string) => void;
  error: (msg: string) => void;
};

export async function saveFile(editor: Editor | null, feedback: Feedback): Promise<void> {
  if (!editor) return;

  try {
    const body = serializeEditor(editor);
    const path = currentFilePath.get();

    if (path) {
      await writeFile(path, body);
      savedSnapshot.set(comparableSnapshot(editor));
      feedback.success('Saved successfully');
      return;
    }

    await saveFileAs(editor, feedback);
  } catch (error) {
    console.error('Error saving file:', error);
    feedback.error('Failed to save file');
  }
}

export async function saveFileAs(editor: Editor | null, feedback: Feedback): Promise<void> {
  if (!editor) return;

  try {
    const body = serializeEditor(editor);
    const path = await pickSavePath();
    if (!path) return;

    await writeFile(path, body);
    currentFilePath.set(path);
    savedSnapshot.set(comparableSnapshot(editor));
    feedback.success('Saved successfully');
  } catch (error) {
    console.error('Error saving file:', error);
    feedback.error('Failed to save file');
  }
}

export async function openFile(editor: Editor | null, feedback: Feedback): Promise<void> {
  if (!editor) return;

  try {
    const choice = await promptSaveIfWanted(editor, feedback);
    if (choice === 'cancel') return;

    const path = await pickOpenPath();
    if (!path) return;

    const body = await readFile(path);
    loadFile(editor, body, path);
  } catch (error) {
    console.error('Error opening file:', error);
    feedback.error('Unable to open file. The .tldr version may not match this app version.');
  }
}

export async function newFile(editor: Editor | null, feedback: Feedback): Promise<void> {
  try {
    if (editor) {
      const choice = await promptSaveIfWanted(editor, feedback);
      if (choice === 'cancel') return;
    }
    editor?.dispose();
    currentFilePath.set(null);
    hardReset({ shouldReload: true });
  } catch (error) {
    console.error('Error creating new file:', error);
    feedback.error('Failed to create new file');
  }
}

export function loadFile(editor: Editor, body: string, path: string): void {
  const parseResult = parseTldrawJsonFile({ json: body, schema: createTLSchema() });
  // @ts-ignore — parseResult is a Result union; trusting success path matches prior behavior
  const snapshot = parseResult.value.getStoreSnapshot();
  editor.loadSnapshot(snapshot);
  currentFilePath.set(path);
  savedSnapshot.set(comparableSnapshot(editor));
}

export async function promptSaveBeforeClose(
  editor: Editor | null,
  feedback: Feedback,
): Promise<SaveChoice> {
  if (editor && !isDirty(editor, savedSnapshot.get())) return 'discard';

  const choice = await confirmSaveOrDiscard(
    'Do you want to save your changes before closing?',
    'Save Changes',
  );
  if (choice === 'save') await saveFile(editor, feedback);
  return choice;
}

async function promptSaveIfWanted(editor: Editor | null, feedback: Feedback): Promise<SaveChoice> {
  if (editor && !isDirty(editor, savedSnapshot.get())) return 'discard';

  const choice = await confirmSaveOrDiscard(
    'Would you like to save the current file?',
    'Save Current File',
  );
  if (choice === 'save') await saveFile(editor, feedback);
  return choice;
}
