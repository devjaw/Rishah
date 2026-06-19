import {
  TLComponents,
  TLUiAssetUrlOverrides,
  TLUiOverrides,
  useTools,
  useIsToolSelected,
  DefaultToolbar,
  TldrawUiMenuItem,
  DefaultToolbarContent,
} from 'tldraw';
import { shapeButtons } from './shapeButtons';
import { CustomStylePanel } from './customStylePanel';
import { IconsTool } from './IconButton';
import iconS from '../../assets/pen-tool.png';

const CustomToolbar: NonNullable<TLComponents['Toolbar']> = (props) => {
  const tools = useTools();
  const isIconsSelected = useIsToolSelected(tools['icons']);
  return (
    <DefaultToolbar {...props}>
      <TldrawUiMenuItem {...tools['icons']} isSelected={isIconsSelected} />
      <DefaultToolbarContent />
    </DefaultToolbar>
  );
};

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools.icons = {
      id: 'icons',
      icon: 'toolbox-icons',
      label: 'Icons',
      onSelect: () => editor.setCurrentTool('icons'),
    };
    return tools;
  },
};

export const tldrawComponents: TLComponents = {
  ...shapeButtons,
  Toolbar: CustomToolbar,
  StylePanel: CustomStylePanel,
};

export const customAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    'toolbox-icons': iconS,
  },
};

export const customTools = [IconsTool];
