import React from 'react';
import { Input } from 'antd';
import * as LucideIcons from 'lucide-react';
import { iconNames, IconName } from 'lucide-react/dynamic';
import { IconGrid } from './IconGrid';
import tagsData from '../../data/lucide-tags.json';

const SEARCH_DEBOUNCE_MS = 150;
const iconTags = tagsData as Record<string, string[]>;

type IconPickerProps = {
  onSelect: (name: IconName) => void;
};

function scoreIcon(iconName: string, term: string): number {
  if (!term) return 1;
  const name = iconName.toLowerCase();
  if (name === term) return 100;
  if (name.startsWith(term)) return 50;
  if (name.includes(term)) return 25;
  const tags = iconTags[iconName];
  if (tags?.some((t) => t.toLowerCase().includes(term))) return 10;
  return 0;
}

export function IconPicker({ onSelect }: IconPickerProps) {
  const [searchInput, setSearchInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(
      () => setSearchTerm(searchInput.trim().toLowerCase()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [searchInput]);

  const filteredIcons = React.useMemo(() => {
    if (!searchTerm) return iconNames;
    const scored: Array<{ name: IconName; score: number }> = [];
    for (const name of iconNames) {
      const score = scoreIcon(name, searchTerm);
      if (score > 0) scored.push({ name, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.name);
  }, [searchTerm]);

  return (
    <div>
      <Input
        prefix={<LucideIcons.Search size={20} />}
        placeholder="Search icons..."
        onChange={(e) => setSearchInput(e.target.value)}
        style={{ marginBottom: '16px' }}
      />
      <IconGrid filteredIcons={filteredIcons} onSelect={onSelect} />
    </div>
  );
}
