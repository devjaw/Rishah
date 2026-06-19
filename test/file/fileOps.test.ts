import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';

vi.mock('tldraw', () => ({
  atom: (_name: string, initial: unknown) => {
    let value = initial;
    return {
      get: () => value,
      set: (next: unknown) => {
        value = next;
      },
    };
  },
  hardReset: vi.fn(),
  createTLSchema: () => ({}),
  parseTldrawJsonFile: ({ json }: { json: string }) => ({
    value: {
      getStoreSnapshot: () => ({ parsed: json }),
    },
  }),
  Editor: class {},
}));

const fakeEditor = {
  getSnapshot: () => ({
    document: {
      store: { 'shape:1': { id: 'shape:1', type: 'rect' } },
      schema: { schemaVersion: 1 },
    },
  }),
  loadSnapshot: vi.fn(),
  dispose: vi.fn(),
} as unknown as import('tldraw').Editor;

function makeFeedback() {
  return { success: vi.fn(), error: vi.fn() };
}

function decodePayload(payload: unknown): string {
  if (payload instanceof Uint8Array) return new TextDecoder().decode(payload);
  if (Array.isArray(payload)) return new TextDecoder().decode(new Uint8Array(payload));
  return String(payload);
}

beforeEach(async () => {
  const { currentFilePath } = await import('../../src/file/fileState');
  currentFilePath.set(null);
});

afterEach(() => {
  clearMocks();
  vi.clearAllMocks();
});

describe('saveFile', () => {
  it('does nothing when editor is null', async () => {
    const { saveFile } = await import('../../src/file/fileOps');
    const fb = makeFeedback();

    await saveFile(null, fb);

    expect(fb.success).not.toHaveBeenCalled();
    expect(fb.error).not.toHaveBeenCalled();
  });

  it('writes to the existing path when currentFilePath is set', async () => {
    const { saveFile } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');
    currentFilePath.set('/tmp/existing.tldr');

    const writes: Array<{ path: string; body: string }> = [];
    mockIPC((cmd, args: any) => {
      if (cmd === 'plugin:fs|write_text_file') {
        writes.push({ path: args.path, body: decodePayload(args) });
        return null;
      }
    });

    const fb = makeFeedback();
    await saveFile(fakeEditor, fb);

    expect(writes).toHaveLength(1);
    expect(fb.success).toHaveBeenCalledWith('Saved successfully');
  });

  it('falls back to Save As when no current path is set', async () => {
    const { saveFile } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');

    const calls: string[] = [];
    mockIPC((cmd) => {
      calls.push(cmd);
      if (cmd === 'plugin:dialog|save') return '/tmp/picked.tldr';
      if (cmd === 'plugin:fs|write_text_file') return null;
    });

    const fb = makeFeedback();
    await saveFile(fakeEditor, fb);

    expect(calls).toContain('plugin:dialog|save');
    expect(calls).toContain('plugin:fs|write_text_file');
    expect(currentFilePath.get()).toBe('/tmp/picked.tldr');
    expect(fb.success).toHaveBeenCalledWith('Saved successfully');
  });
});

describe('saveFileAs', () => {
  it('does nothing when the user cancels the dialog', async () => {
    const { saveFileAs } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');

    let wrote = false;
    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|save') return null;
      if (cmd === 'plugin:fs|write_text_file') {
        wrote = true;
        return null;
      }
    });

    const fb = makeFeedback();
    await saveFileAs(fakeEditor, fb);

    expect(wrote).toBe(false);
    expect(currentFilePath.get()).toBe(null);
    expect(fb.success).not.toHaveBeenCalled();
  });

  it('writes file and updates currentFilePath on success', async () => {
    const { saveFileAs } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');

    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|save') return '/tmp/new.tldr';
      if (cmd === 'plugin:fs|write_text_file') return null;
    });

    const fb = makeFeedback();
    await saveFileAs(fakeEditor, fb);

    expect(currentFilePath.get()).toBe('/tmp/new.tldr');
    expect(fb.success).toHaveBeenCalledWith('Saved successfully');
  });

  it('reports an error when writing fails', async () => {
    const { saveFileAs } = await import('../../src/file/fileOps');

    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|save') return '/tmp/new.tldr';
      if (cmd === 'plugin:fs|write_text_file') throw new Error('disk full');
    });

    const fb = makeFeedback();
    await saveFileAs(fakeEditor, fb);

    expect(fb.error).toHaveBeenCalledWith('Failed to save file');
  });
});

describe('openFile', () => {
  it('does nothing when the user cancels the dialog', async () => {
    const { openFile } = await import('../../src/file/fileOps');

    let read = false;
    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|ask') return false;
      if (cmd === 'plugin:dialog|open') return null;
      if (cmd === 'plugin:fs|read_text_file') {
        read = true;
        return '';
      }
    });

    const fb = makeFeedback();
    await openFile(fakeEditor, fb);

    expect(read).toBe(false);
  });

  it('reads the picked file and loads it into the editor', async () => {
    const { openFile } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');

    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|ask') return false;
      if (cmd === 'plugin:dialog|open') return '/tmp/source.tldr';
      if (cmd === 'plugin:fs|read_text_file') return '{"schema":{},"records":[]}';
    });

    const fb = makeFeedback();
    await openFile(fakeEditor, fb);

    expect(fakeEditor.loadSnapshot).toHaveBeenCalled();
    expect(currentFilePath.get()).toBe('/tmp/source.tldr');
    expect(fb.error).not.toHaveBeenCalled();
  });
});

describe('save/open round-trip', () => {
  it('preserves the file content between save and open', async () => {
    const { saveFileAs, openFile } = await import('../../src/file/fileOps');

    let writtenBody: string | undefined;
    mockIPC((cmd, args: any) => {
      if (cmd === 'plugin:dialog|save') return '/tmp/round.tldr';
      if (cmd === 'plugin:dialog|open') return '/tmp/round.tldr';
      if (cmd === 'plugin:dialog|ask') return false;
      if (cmd === 'plugin:fs|write_text_file') {
        writtenBody = decodePayload(args);
        return null;
      }
      if (cmd === 'plugin:fs|read_text_file') {
        return Array.from(new TextEncoder().encode(writtenBody ?? ''));
      }
    });

    const fb = makeFeedback();

    await saveFileAs(fakeEditor, fb);
    expect(writtenBody).toBeTruthy();
    expect(fb.success).toHaveBeenCalledWith('Saved successfully');

    await openFile(fakeEditor, fb);

    expect(fakeEditor.loadSnapshot).toHaveBeenCalledWith({ parsed: writtenBody });
  });
});

describe('promptSaveBeforeClose', () => {
  it('saves when the user confirms', async () => {
    const { promptSaveBeforeClose } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');
    currentFilePath.set('/tmp/existing.tldr');

    let wrote = false;
    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|ask') return true;
      if (cmd === 'plugin:fs|write_text_file') {
        wrote = true;
        return null;
      }
    });

    const fb = makeFeedback();
    await promptSaveBeforeClose(fakeEditor, fb);

    expect(wrote).toBe(true);
    expect(fb.success).toHaveBeenCalledWith('Saved successfully');
  });

  it('does not save when the user declines', async () => {
    const { promptSaveBeforeClose } = await import('../../src/file/fileOps');
    const { currentFilePath } = await import('../../src/file/fileState');
    currentFilePath.set('/tmp/existing.tldr');

    let wrote = false;
    mockIPC((cmd) => {
      if (cmd === 'plugin:dialog|ask') return false;
      if (cmd === 'plugin:fs|write_text_file') {
        wrote = true;
        return null;
      }
    });

    const fb = makeFeedback();
    await promptSaveBeforeClose(fakeEditor, fb);

    expect(wrote).toBe(false);
    expect(fb.success).not.toHaveBeenCalled();
  });
});
