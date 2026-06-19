import {
  TLComponents,
  TLUiOverrides,
  useTools,
  useIsToolSelected,
  DefaultToolbar,
  TldrawUiMenuItem,
  DefaultToolbarContent,
} from 'tldraw';
import { shapeButtons } from './shapeButtons';
import { CustomStylePanel } from './customStylePanel';

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
