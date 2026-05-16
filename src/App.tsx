import { useState, useEffect, useCallback } from 'react';
import { Chat, Message, User } from './types';
import { loadChats, saveChats, loadUser, saveUser, registerUser, loginUser, updateUserInDB } from './store';
import { askAnoAI, clearAIHistory } from './ai';
import LeftPanel from './components/LeftPanel';
import ChatArea from './components/ChatArea';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const createNewChat = useCallback(() => {
    const id = generateId();
    const newChat: Chat = {
      id,
      title: 'Новый чат',
      messages: [],
      createdAt: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(id);
    clearAIHistory(id);
  }, []);

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    } else if (!activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, []);

  const handleSendMessage = useCallback(async (text: string, editingMsgId?: string) => {
    if (!activeChatId) return;
    const now = nowTime();

    if (editingMsgId) {
      setChats(prev => prev.map(c => {
        if (c.id !== activeChatId) return c;
        const msgIdx = c.messages.findIndex(m => m.id === editingMsgId);
        if (msgIdx === -1) return c;
        const newMsgs = [...c.messages];
        newMsgs[msgIdx] = { ...newMsgs[msgIdx], text, time: now, blocked: false };
        
        const thinkingId = generateId();
        newMsgs.splice(msgIdx + 1, 0, { id: thinkingId, role: 'thinking', text: '', time: now });

        askAnoAI(
          activeChatId,
          text,
          () => {},
          (id, result) => {
            setChats(prev2 => prev2.map(c2 => {
              if (c2.id !== activeChatId) return c2;
              const i = c2.messages.findIndex(m => m.id === id);
              if (i === -1) return c2;
              const highlights = parseHighlights(result);
              const cleanText = stripMetadata(result);
              const updated = [...c2.messages];
              if (result === '[blocked]') {
                updated[i-1] = { ...updated[i-1], blocked: true };
                updated[i] = { ...updated[i], role: 'assistant', text: 'Ваш запрос нарушает правила моей политики', time: nowTime() };
              } else {
                updated[i] = { ...updated[i], role: 'assistant', text: cleanText, highlights, time: nowTime() };
              }
              return { ...c2, messages: updated };
            }));
          },
          thinkingId
        );
        return { ...c, messages: newMsgs, createdAt: Date.now() };
      }));
      return;
    }

    const userMsg: Message = { id: generateId(), role: 'user', text, time: now };
    const thinkingId = generateId();
    const thinkingMsg: Message = { id: thinkingId, role: 'thinking', text: '', time: now };

    setChats(prev => prev.map(c => {
      if (c.id !== activeChatId) return c;
      const isFirst = c.messages.length === 0;
      const title = isFirst ? text.slice(0, 40) + (text.length > 40 ? '...' : '') : c.title;
      return { ...c, title, messages: [...c.messages, userMsg, thinkingMsg], createdAt: Date.now() };
    }));

    await askAnoAI(
      activeChatId,
      text,
      () => {},
      (id, result) => {
        setChats(prev => prev.map(c => {
          if (c.id !== activeChatId) return c;
          const i = c.messages.findIndex(m => m.id === id);
          if (i === -1) return c;
          const highlights = parseHighlights(result);
          const cleanText = stripMetadata(result);
          const updated = [...c.messages];
          if (result === '[blocked]') {
            updated[i-1] = { ...updated[i-1], blocked: true };
            updated[i] = { ...updated[i], role: 'assistant', text: 'Ваш запрос нарушает правила моей политики', time: nowTime() };
          } else {
            updated[i] = { ...updated[i], role: 'assistant', text: cleanText, highlights, time: nowTime() };
          }
          return { ...c, messages: updated };
        }));
      },
      thinkingId
    );
  }, [activeChatId]);

  const handleDeleteChat = useCallback((id: string) => {
    setChats(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeChatId === id) {
        if (next.length > 0) setActiveChatId(next[0].id);
        else {
          const newId = generateId();
          setActiveChatId(newId);
          return [{ id: newId, title: 'Новый чат', messages: [], createdAt: Date.now() }];
        }
      }
      return next;
    });
    clearAIHistory(id);
  }, [activeChatId]);

  const handleAvatarChange = useCallback((avatar: string) => {
    if (!user) return;
    const updated = { ...user, avatar };
    setUser(updated);
    saveUser(updated);
    updateUserInDB(user.email, { avatar });
  }, [user]);

  const handleNameChange = useCallback((name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    setUser(updated);
    saveUser(updated);
    updateUserInDB(user.email, { name });
  }, [user]);

  const handleAvatarClick = useCallback(() => {
    if (!user) { setAuthMode('login'); setShowAuth(true); }
    else { setShowProfile(true); }
  }, [user]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #e8e8e8 100%)' }}>
      <LeftPanel
        chats={chats}
        activeChatId={activeChatId}
        user={user}
        panelOpen={panelOpen}
        onPanelToggle={() => setPanelOpen(p => !p)}
        onNewChat={createNewChat}
        onSelectChat={id => setActiveChatId(id)}
        onDeleteChat={handleDeleteChat}
        onAvatarClick={handleAvatarClick}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatArea
          chat={activeChat}
          onSend={handleSendMessage}
          user={user}
        />
      </div>
      {showAuth && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onRegister={async (n, e, p) => {
            const res = await registerUser(n, e, p);
            if (res.ok) { const u = { name: n, email: e, avatar: null }; setUser(u); saveUser(u); setShowAuth(false); return null; }
            return res.error || 'Ошибка';
          }}
          onLogin={async (e, p) => {
            const res = await loginUser(e, p);
            if (res.ok && res.user) { const u = { name: res.user.name, email: e, avatar: res.user.avatar }; setUser(u); saveUser(u); setShowAuth(false); return null; }
            return res.error || 'Ошибка';
          }}
          onClose={() => setShowAuth(false)}
        />
      )}
      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onAvatarChange={handleAvatarChange}
          onNameChange={handleNameChange}
          onLogout={() => { setUser(null); saveUser(null); setShowProfile(false); }}
        />
      )}
    </div>
  );
}

function parseHighlights(text: string): string[] {
  // Ищем HIGHLIGHTS только если они есть в тексте
  const match = text.match(/HIGHLIGHTS:\[([^\]]*)\]/i);
  if (!match) return [];
  try { return JSON.parse('[' + match[1] + ']'); } catch { return []; }
}

function stripMetadata(text: string): string {
  // Убираем HIGHLIGHTS из финального отображения
  return text.replace(/\n?HIGHLIGHTS:\[[^\]]*\]/gi, '').trim();
}
