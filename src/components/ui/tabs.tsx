import { useState } from 'react';

export interface TabItem { key: string; label: string; content: React.ReactNode }

export default function Tabs({ items, defaultActiveKey }: { items: TabItem[]; defaultActiveKey?: string }) {
  const [active, setActive] = useState(defaultActiveKey ?? items[0]?.key);
  const activeItem = items.find(i => i.key === active);
  return (
    <div>
      <div className="mb-2 flex gap-2">
        {items.map(i => (
          <button key={i.key} onClick={() => setActive(i.key)} className={`rounded-md px-3 py-1 ${active === i.key ? 'bg-primary text-white' : 'bg-gray-100'}`}>
            {i.label}
          </button>
        ))}
      </div>
      <div>{activeItem?.content}</div>
    </div>
  );
}
