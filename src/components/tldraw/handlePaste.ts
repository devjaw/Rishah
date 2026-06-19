import {
  Editor,
  TLTldrawExternalContent,
  AssetRecordType,
  defaultHandleExternalTldrawContent,
} from 'tldraw';

export function handleCustomTldrawPaste(
  editor: Editor,
  { content, point }: TLTldrawExternalContent,
) {
  let a = content.shapes.filter((v) => v.meta?.type != null);
  if (!a) return;

  a.forEach((b) => {
    // @ts-ignore
    let currentAssetId = b.props?.assetId;
    let getCurrentAsset = content.assets.filter((v) => v.id == currentAssetId)[0];
    console.log(getCurrentAsset);

    const assetId = AssetRecordType.createId();
    editor.createAssets([
      {
        ...getCurrentAsset,
        id: assetId,
      },
    ]);

    // @ts-ignore
    b.props.assetId = assetId;
  });

  defaultHandleExternalTldrawContent(editor, { content, point });
  return;
}
