import { useState, useRef, useEffect, memo } from 'react';
import { Chat, User } from '../types';

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  user: User | null;
  panelOpen: boolean;
  onPanelToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onAvatarClick: () => void;
  onRulesClick?: () => void;
}

export default memo(function LeftPanel({ chats, activeChatId, user, panelOpen, onPanelToggle, onNewChat, onSelectChat, onDeleteChat, onAvatarClick, onRulesClick }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuId(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuId]);

  const filtered = search.trim() ? chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : chats;
  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="relative flex flex-col h-full flex-shrink-0 transition-[width] duration-300" style={{ width: panelOpen ? 280 : 80, overflow: 'hidden' }}>
      {panelOpen ? (
        <div className="flex flex-col h-full bg-surface-container border-r border-border">
          <div className="flex items-center justify-between pt-4 pb-3 px-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onAvatarClick} className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-border bg-surface-dim btn btn-light">
                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#999" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="1.6" strokeLinecap="round"/></svg>}
              </button>
              <span className="text-sm font-semibold text-text truncate">{user?.name || 'Гость'}</span>
            </div>
            <button onClick={onPanelToggle} className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface-dim transition-colors btn btn-light">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="flex-1"><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск чатов..." className="w-full bg-transparent outline-none text-xs pb-1 text-text placeholder:text-text-muted" /><div className="h-px mt-1 bg-border-strong" /></div>
            <button onClick={onNewChat} className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface-dim transition-colors btn btn-light">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="px-4 pb-2"><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">Недавнее</span></div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {sorted.map(c => (
              <div key={c.id} className="relative mb-0.5" ref={menuId === c.id ? ref : undefined}>
                <div onClick={() => onSelectChat(c.id)} className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors text-sm btn btn-light max-w-[240px] mx-auto" style={{ background: c.id === activeChatId ? 'rgba(0,0,0,0.04)' : '', borderLeft: c.id === activeChatId ? '3px solid #1a1a1a' : '3px solid transparent' }}>
                  <span className="truncate flex-1 text-text-secondary text-xs font-medium pr-1">{c.title}</span>
                  <button onClick={e => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id); }} className="p-1 rounded-lg hover:bg-surface-dim flex-shrink-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="#aaa"/><circle cx="12" cy="12" r="1.5" fill="#aaa"/><circle cx="12" cy="19" r="1.5" fill="#aaa"/></svg></button>
                </div>
                {menuId === c.id && <div className="absolute right-2 top-10 z-50 rounded-xl shadow-md py-1 bg-surface border border-border min-w-[100px]"><button onClick={() => { onDeleteChat(c.id); setMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors">Удалить</button></div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-start pt-6 h-full bg-surface-container border-r border-border">
          <div className="flex flex-col items-center gap-3 p-3">
            <button onClick={onAvatarClick} className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-border bg-surface-dim btn btn-light">
              {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#999" strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            </button>
            <button onClick={onNewChat} className="w-14 h-14 flex items-center justify-center hover:scale-105 transition-transform"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#666" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <button onClick={onPanelToggle} className="w-14 h-14 flex items-center justify-center hover:scale-105 transition-transform"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg></button>
          </div>
          <div className="mt-auto pb-5">
            <button onClick={onRulesClick} className="w-14 h-14 flex items-center justify-center hover:scale-105 transition-transform"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          </div>
        </div>
      )}
    </div>
  );
});
