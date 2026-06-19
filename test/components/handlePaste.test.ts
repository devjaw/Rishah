import { describe, it, expect, vi, beforeEach } from 'vitest';

let idCounter = 0;
const defaultHandleSpy = vi.fn();

vi.mock('tldraw', () => ({
  Editor: class {},
  AssetRecordType: {
    createId: () => `asset:new-${++idCounter}`,
  },
  defaultHandleExternalTldrawContent: (...args: unknown[]) => defaultHandleSpy(...args),
}));

function makeEditor() {
  return {
    createAssets: vi.fn(),
  } as any;
}

function shape(id: string, opts: { metaType?: string | null; assetId?: string } = {}) {
  return {
    id,
    type: 'image',
    meta: opts.metaType ? { type: opts.metaType } : {},
    props: { assetId: opts.assetId },
  };
}

function asset(id: string) {
  return { id, type: 'image', props: { src: `data:${id}` } };
}

const point = { x: 0, y: 0 };

beforeEach(() => {
  idCounter = 0;
  defaultHandleSpy.mockClear();
});

describe('handleCustomTldrawPaste', () => {
  it('skips shapes that have no meta.type and still delegates to the default handler', async () => {
    const { handleCustomTldrawPaste } = await import('../../src/components/tldraw/handlePaste');
    const editor = makeEditor();
    const content: any = {
      shapes: [shape('shape:1'), shape('shape:2')],
      assets: [asset('asset:src-1')],
    };

    handleCustomTldrawPaste(editor, { content, point } as any);

    expect(editor.createAssets).not.toHaveBeenCalled();
    expect(defaultHandleSpy).toHaveBeenCalledTimes(1);
    expect(defaultHandleSpy).toHaveBeenCalledWith(editor, { content, point });
  });

  it('clones the asset with a fresh id and rewires the shape to it', async () => {
    const { handleCustomTldrawPaste } = await import('../../src/components/tldraw/handlePaste');
    const editor = makeEditor();
    const srcAsset = asset('asset:src-1');
    const taggedShape = shape('shape:1', { metaType: 'icon', assetId: 'asset:src-1' });
    const content: any = {
      shapes: [taggedShape],
      assets: [srcAsset],
    };

    handleCustomTldrawPaste(editor, { content, point } as any);

    expect(editor.createAssets).toHaveBeenCalledTimes(1);
    const [createdAssets] = editor.createAssets.mock.calls[0];
    expect(createdAssets).toHaveLength(1);
    expect(createdAssets[0]).toEqual({ ...srcAsset, id: 'asset:new-1' });

    expect(taggedShape.props.assetId).toBe('asset:new-1');
    expect(defaultHandleSpy).toHaveBeenCalledWith(editor, { content, point });
  });

  it('gives each tagged shape a distinct fresh asset id', async () => {
    const { handleCustomTldrawPaste } = await import('../../src/components/tldraw/handlePaste');
    const editor = makeEditor();
    const a1 = asset('asset:src-1');
    const a2 = asset('asset:src-2');
    const s1 = shape('shape:1', { metaType: 'icon', assetId: 'asset:src-1' });
    const s2 = shape('shape:2', { metaType: 'icon', assetId: 'asset:src-2' });
    const content: any = { shapes: [s1, s2], assets: [a1, a2] };

    handleCustomTldrawPaste(editor, { content, point } as any);

    expect(editor.createAssets).toHaveBeenCalledTimes(2);
    expect(s1.props.assetId).toBe('asset:new-1');
    expect(s2.props.assetId).toBe('asset:new-2');
    expect(s1.props.assetId).not.toBe(s2.props.assetId);
  });

  it('always delegates to the default handler (even when content has no shapes)', async () => {
    const { handleCustomTldrawPaste } = await import('../../src/components/tldraw/handlePaste');
    const editor = makeEditor();
    const content: any = { shapes: [], assets: [] };

    handleCustomTldrawPaste(editor, { content, point } as any);

    expect(editor.createAssets).not.toHaveBeenCalled();
    expect(defaultHandleSpy).toHaveBeenCalledTimes(1);
  });
});
