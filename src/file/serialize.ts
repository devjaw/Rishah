import { Editor } from 'tldraw';

const DOCUMENT_RECORD_PREFIXES = ['shape:', 'page:', 'document:', 'asset:'];

function isDocumentRecord(record: { id?: string }): boolean {
  return DOCUMENT_RECORD_PREFIXES.some((p) => record.id?.startsWith(p));
}

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

export function comparableSnapshot(editor: Editor): string {
  const snapshot = editor.getSnapshot();
  const records = Object.values(snapshot.document.store).filter(isDocumentRecord);
  return JSON.stringify({ records });
}

export function isDirty(editor: Editor, baseline: string | null): boolean {
  if (baseline === null) return true;
  return comparableSnapshot(editor) !== baseline;
}
