import { Editor } from 'tldraw';

export function serializeEditor(editor: Editor): string {
  const snapshot = editor.getSnapshot();
  const store = snapshot.document.store;
  const schema = snapshot.document.schema;
  const records = Object.values(store);

  return JSON.stringify({
    schema,
    records,
    tldrawFileFormatVersion: 1,
  });
}
