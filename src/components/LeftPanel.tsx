import { useState, useRef, useEffect } from 'react';
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
}

export default function LeftPanel({
  chats, activeChatId, user, panelOpen,
  onPanelToggle, onNewChat, onSelectChat, onDeleteChat, onAvatarClick
}: Props) {
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuChatId(null);
      }
    };
    if (menuChatId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuChatId]);

  const filteredChats = searchQuery.trim()
    ? chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  const sortedChats = [...filteredChats].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div
      className="relative flex flex-col h-full flex-shrink-0"
      style={{
        width: panelOpen ? '280px' : '80px',
        background: panelOpen ? 'linear-gradient(180deg, #fafafa 0%, #f3f3f3 100%)' : 'transparent',
        borderRight: panelOpen ? '1px solid rgba(0,0,0,0.07)' : 'none',
        boxShadow: panelOpen ? '2px 0 16px rgba(0,0,0,0.03)' : 'none',
        transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1), background 0.3s ease',
        overflow: 'visible',
      }}
    >
      {panelOpen ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pt-4 pb-3 px-4 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onAvatarClick}
                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                style={{
                  border: '1.5px solid rgba(0,0,0,0.09)',
                  background: 'linear-gradient(135deg, #ececec, #e0e0e0)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarIcon />
                )}
              </button>
              <span className="text-sm font-semibold text-gray-700 truncate overflow-hidden">
                {user?.name || 'Гость'}
              </span>
            </div>
            <button
              onClick={onPanelToggle}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Свернуть панель"
            >
              <ChevronLeftIcon />
            </button>
          </div>

          <div className="px-4 py-3 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск чатов..."
                className="w-full bg-transparent outline-none text-xs pb-1"
              />
              <div className="h-px mt-1 bg-gray-300" />
            </div>
            <button
              onClick={onNewChat}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
              title="Новый чат"
            >
              <PlusIcon />
            </button>
          </div>

          <div className="px-4 pb-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide px-2">Недавнее</h3>
          </div>

          <div
            className="flex-1 overflow-y-auto px-3 pb-4"
            style={{ scrollbarWidth: 'thin' }}
          >
            {sortedChats.map(chat => (
              <div key={chat.id} className="relative mb-1" ref={menuChatId === chat.id ? menuRef : undefined}>
                <div
                  onClick={() => onSelectChat(chat.id)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all text-sm"
                  style={{
                    background: chat.id === activeChatId ? 'rgba(255,255,255,0.8)' : 'transparent',
                    border: chat.id === activeChatId ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
                    boxShadow: chat.id === activeChatId ? '0 1px 6px rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                  <span className="truncate flex-1 text-gray-700 font-medium pr-2">{chat.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuChatId(menuChatId === chat.id ? null : chat.id); }}
                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                  >
                    <DotsIcon />
                  </button>
                </div>
                {menuChatId === chat.id && (
                  <div
                    className="absolute right-2 top-12 z-50 rounded-xl shadow-xl py-1 bg-white border border-gray-100"
                    style={{ minWidth: '120px' }}
                  >
                    <button
                      onClick={() => { onDeleteChat(chat.id); setMenuChatId(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center pt-6 gap-3" style={{ position: 'absolute', top: '0px', left: '32px', right: '8px', zIndex: 10 }}>
          {/* Закруглённый фон для кнопок */}
          <div
            className="flex flex-col items-center gap-3 p-3"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)',
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <button
              onClick={onAvatarClick}
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              style={{
                border: '2px solid rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #ececec, #e0e0e0)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <AvatarIconSm />
              )}
            </button>
            <button
              onClick={onNewChat}
              title="Новый чат"
              className="w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-white/90 transition-all"
              style={{ 
                border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff',
              }}
            >
              <PlusIcon />
            </button>
            <button
              onClick={onPanelToggle}
              title="Открыть панель чатов"
              className="w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-white/90 transition-all"
              style={{ 
                border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff',
              }}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="#aaa" strokeWidth="1.6"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function AvatarIconSm() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="#999" strokeWidth="1.8"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="#666" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.6" fill="#aaa"/>
      <circle cx="12" cy="12" r="1.6" fill="#aaa"/>
      <circle cx="12" cy="19" r="1.6" fill="#aaa"/>
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
