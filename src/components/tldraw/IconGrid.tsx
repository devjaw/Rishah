import React from 'react';
import { Tooltip } from 'antd';
import * as LucideIcons from 'lucide-react';
import { IconName } from 'lucide-react/dynamic';
import { Grid, type CellComponentProps } from 'react-window';

const CELL_SIZE = 56;
const ICON_SIZE = 30;
const GRID_HEIGHT = 400;

export const toPascalCase = (str: string) =>
  str.replace(/(^\w|[-_]\w)/g, (m) => m.replace(/[-_]/, '').toUpperCase());

type IconCellProps = {
  filteredIcons: IconName[];
  columnCount: number;
  onSelect: (name: IconName) => void;
};

function IconCell({
  columnIndex,
  rowIndex,
  style,
  filteredIcons,
  columnCount,
  onSelect,
}: CellComponentProps<IconCellProps>) {
  const idx = rowIndex * columnCount + columnIndex;
  const iconName = filteredIcons[idx];
  if (!iconName) return null;
  const IconComponent = (LucideIcons as any)[toPascalCase(iconName)];
  if (!IconComponent) return null;
  return (
    <div style={style}>
      <Tooltip title={iconName}>
        <div
          onClick={() => onSelect(iconName)}
          style={{
            cursor: 'pointer',
            padding: 8,
          }}
        >
          <IconComponent size={ICON_SIZE} strokeWidth={1.5} />
        </div>
      </Tooltip>
    </div>
  );
}

type IconGridProps = {
  filteredIcons: IconName[];
  onSelect: (name: IconName) => void;
};

export function IconGrid({ filteredIcons, onSelect }: IconGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [gridHeight, setGridHeight] = React.useState(() =>
    Math.min(GRID_HEIGHT, Math.floor(window.innerHeight * 0.5))
  );

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(w);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const onResize = () =>
      setGridHeight(Math.min(GRID_HEIGHT, Math.floor(window.innerHeight * 0.5)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const columnCount = Math.max(1, Math.floor(containerWidth / CELL_SIZE));
  const rowCount = Math.ceil(filteredIcons.length / columnCount);

  return (
    <div
      ref={containerRef}
      style={{ height: gridHeight, width: '100%', overflow: 'hidden' }}
    >
      {containerWidth > 0 && (
        <Grid
          cellComponent={IconCell}
          cellProps={{ filteredIcons, columnCount, onSelect }}
          columnCount={columnCount}
          columnWidth={CELL_SIZE}
          rowCount={rowCount}
          rowHeight={CELL_SIZE}
          defaultHeight={gridHeight}
          defaultWidth={containerWidth}
          style={{ width: containerWidth, height: gridHeight }}
        />
      )}
    </div>
  );
}
