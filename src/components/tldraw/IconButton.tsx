import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StateNode, TLImageShape, AssetRecordType, createShapeId } from 'tldraw';
import { Modal } from 'antd';
import * as LucideIcons from 'lucide-react';
import { IconName } from 'lucide-react/dynamic';
import { X } from 'lucide-react';
import { IconPicker } from './IconPicker';
import { toPascalCase } from './IconGrid';

export class IconsTool extends StateNode {
  static override id = 'icons';

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    this.editor.setCurrentTool('select');

    const convertLucideToSVG = (iconName: IconName, props = {}) => {
      const pas: IconName = toPascalCase(iconName) as IconName;
      // @ts-ignore
      const IconComponent = LucideIcons[pas];

      if (!IconComponent) {
        throw new Error(`Icon "${iconName}" not found`);
      }

      const defaultProps = {
        size: 24,
        color: 'currentColor',
        strokeWidth: 1.5,
        ...props,
      };

      const iconElement = React.createElement(IconComponent, defaultProps);
      return ReactDOMServer.renderToStaticMarkup(iconElement);
    };

    const handleIconSelect = async (iconName: IconName) => {
      const { currentPagePoint } = this.editor.inputs;

      const pas: IconName = toPascalCase(iconName) as IconName;
      const svgString = convertLucideToSVG(pas);
      const dataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);

      const assetId = AssetRecordType.createId();
      this.editor.createAssets([
        {
          id: assetId,
          type: 'image',
          typeName: 'asset',
          meta: {},
          props: {
            name: iconName,
            src: dataUri,
            w: 32,
            h: 32,
            mimeType: 'image/svg+xml',
            isAnimated: false,
          },
        },
      ]);

      const ShapeId = createShapeId();
      this.editor.createShape<TLImageShape>({
        id: ShapeId,
        type: 'image',
        meta: { type: 'icon' },
        x: currentPagePoint.x - 50,
        y: currentPagePoint.y - 50,
        props: {
          assetId: assetId,
          w: 32,
          h: 32,
        },
      });

      this.editor.setSelectedShapes([ShapeId]);
      modal.destroy();
    };

    const modal = Modal.info({
      title: 'Select an Icon',
      icon: null,
      centered: true,
      width: 'min(720px, 90vw)',
      content: <IconPicker onSelect={handleIconSelect} />,
      footer: null,
      closable: true,
      closeIcon: <X size={16} />,
      onCancel() {
        modal.destroy();
      },
    });
  }

  override onPointerDown() {}
  override onPointerUp() {}
}
