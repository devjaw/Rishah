import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StateNode, TLImageShape, AssetRecordType, createShapeId} from 'tldraw';
import { Modal, Tooltip, Input } from 'antd';
import * as LucideIcons from 'lucide-react';
import { DynamicIcon, iconNames,IconName } from 'lucide-react/dynamic';


export class IconsTool extends StateNode {
  static override id = 'icons';


  
  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    this.editor.setCurrentTool('select')

    const convertLucideToSVG = (iconName:IconName, props = {}) => {



    const pas:IconName = toPascalCase(iconName) as IconName;
    //const IconComponent = LucideIcons[iconName];
    const IconComponent = LucideIcons[pas];

    if (!IconComponent) {
      throw new Error(`Icon "${iconName}" not found`);
    }

    const defaultProps = {
      size: 24,
      color: 'currentColor',
      strokeWidth: 2,
      ...props
    };

    const iconElement = React.createElement(IconComponent, defaultProps);
    const svgString = ReactDOMServer.renderToStaticMarkup(iconElement);

    return svgString;
    };

    const toPascalCase = (str:IconName) => {
      return str.replace(/(^\w|[-_]\w)/g, (match) => 
        match.replace(/[-_]/, '').toUpperCase()
      );
    };

    const handleIconSelect = async(iconName: IconName) => {
      console.log(iconName)
      const { currentPagePoint } = this.editor.inputs;

      // 1. Render the icon component to an SVG string
//      const svgString = ReactDOMServer.renderToStaticMarkup(<Icon width={32} height={32} />);
      const pas:IconName = toPascalCase(iconName) as IconName;
      const svgString = convertLucideToSVG(pas)
        console.log(svgString)

      // 2. Create a data URI from the SVG string
      const dataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);

      // 3. Create a new asset for the image
      const assetId = AssetRecordType.createId()
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
          }
        }
      ]);


      // 4. Create an image shape on the canvas
      const ShapeId = createShapeId()
      this.editor.createShape<TLImageShape>({
        id:ShapeId,
        type: 'image',
        x: currentPagePoint.x - 50,
        y: currentPagePoint.y - 50,
        props: {
          assetId: assetId,
          w: 32,
          h: 32,
        },
      });
      
      
      this.editor.setSelectedShapes([ShapeId])
      modal.destroy();
    };

    console.log(iconNames)
    const IconPicker = () => {
      const [searchTerm, setSearchTerm] = React.useState('');

      const filteredIcons = iconNames.filter((iconName) =>
        iconName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const iconList = filteredIcons.map((iconName) => {
        return (
          <Tooltip title={iconName} key={iconName}>
            <div onClick={() => handleIconSelect(iconName)} style={{ cursor: 'pointer', padding: '8px', border: '1px solid #eee', borderRadius: '4px' }}>
              <DynamicIcon name={iconName} size={20} />
            </div>
          </Tooltip>
        );
      });

      return (
        <div>
          <Input
            prefix={<LucideIcons.Search size={20} />}
            placeholder="Search icons..."
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
            {iconList}
          </div>
        </div>
      );
    };
    
    const modal = Modal.info({
      title: 'Select an Icon',
      content: <IconPicker />,
      onOk() {},
      okText: 'Close'
    });
  }

  override onPointerDown() {}
  override onPointerUp() {}
}