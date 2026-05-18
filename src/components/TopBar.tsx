import { memo } from 'react';
import * as Tabs from '@radix-ui/react-tabs';

interface Props {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const items = [
  { id: 'ai', label: 'Режим ИИ' },
  { id: 'images', label: 'Картинки' },
  { id: 'news', label: 'Новости' },
];

export default memo(function TopBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex items-center px-6 flex-shrink-0 h-20 sticky top-0 z-20 bg-white border-b border-gray-200">
      <Tabs.Root value={activeTab} onValueChange={onTabChange}>
        <Tabs.List className="flex gap-1">
          {items.map(t => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="relative px-5 py-2 text-sm font-medium bg-transparent text-gray-500 data-[state=active]:text-gray-800 cursor-pointer transition-colors duration-200 min-w-[100px] text-center"
            >
              {t.label}
              <span
                className="absolute bottom-0 left-[10%] h-0.5 bg-gray-800 rounded-full transition-all duration-200"
                style={{ width: activeTab === t.id ? '80%' : '0%' }}
              />
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </div>
  );
});
