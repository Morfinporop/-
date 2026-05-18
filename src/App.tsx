import { useState, useEffect, useCallback } from 'react';
import { Chat, User } from './types';
import { loadChats, saveChats, loadUser, saveUser, registerUser, loginUser, updateUserInDB } from './store';
import { askAnoAI, clearAIHistory, stopGeneration } from './ai';
import LeftPanel from './components/LeftPanel';
import ChatArea from './components/ChatArea';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import TopBar from './components/TopBar';
import ImagesFeed from './components/ImagesFeed';
import NewsFeed from './components/NewsFeed';

function generateId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function nowTime() { const d = new Date(); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); }
function parseHighlights(text: string): string[] { const m = text.match(/HIGHLIGHTS:\[([^\]]*)\]/i); if (!m) return []; try { return JSON.parse('[' + m[1] + ']'); } catch { return []; } }
function stripMeta(text: string): string { return text.replace(/\n?HIGHLIGHTS:\[[^\]]*\]/gi, '').trim(); }

const UPLOAD_IMG = /загрузи в картинки/i;
const UPLOAD_NEWS = /загрузи в новости/i;

const getImages = () => JSON.parse(localStorage.getItem('moai_images') || '[]');
const saveImages = (d: any) => localStorage.setItem('moai_images', JSON.stringify(d));
const getNews = () => JSON.parse(localStorage.getItem('moai_news') || '[]');
const saveNews = (d: any) => localStorage.setItem('moai_news', JSON.stringify(d));

export default function App() {
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'images' | 'news'>('ai');

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  useEffect(() => { saveChats(chats); }, [chats]);

  const createNewChat = useCallback(() => {
    const id = generateId();
    setChats(prev => [{ id, title: 'Новый чат', messages: [], createdAt: Date.now() }, ...prev]);
    setActiveChatId(id);
    clearAIHistory(id);
    setActiveTab('ai');
    setIsGenerating(false);
  }, []);

  useEffect(() => {
    if (chats.length === 0) createNewChat();
    else if (!activeChatId) setActiveChatId(chats[0].id);
  }, []);

  const processResult = useCallback((chatId: string, id: string, result: string, userText: string, media?: string[]) => {
    setIsGenerating(false);
    
    // ПРОВЕРКА НА ЗАБЛОКИРОВАННЫЙ КОНТЕНТ
    if (result === 'Недоступный контент!') {
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c;
        const i = c.messages.findIndex(m => m.id === id);
        if (i === -1) return c;
        const updated = [...c.messages];
        if (i > 0) updated[i - 1] = { ...updated[i - 1], blocked: true };
        updated[i] = { ...updated[i], role: 'assistant' as const, text: result, time: nowTime() };
        return { ...c, messages: updated };
      }));
      return; // ПРЕРЫВАЕМ - ничего не загружаем в ленты
    }

    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      const i = c.messages.findIndex(m => m.id === id);
      if (i === -1) return c;
      const updated = [...c.messages];
      if (result === '[stopped]') {
        updated[i] = { ...updated[i], role: 'assistant' as const, text: '[stopped]', time: nowTime() };
      } else {
        const highlights = parseHighlights(result);
        const cleanText = stripMeta(result);
        updated[i] = { ...updated[i], role: 'assistant' as const, text: cleanText, highlights, time: nowTime() };

        const uName = user?.name || 'Гость';
        const uAvatar = user?.avatar || null;

        // Загрузка только если нет блокировки
        if (UPLOAD_IMG.test(userText) && media && media.length > 0) {
          const imgs = getImages();
          media.forEach(m => { if (m.startsWith('data:image')) imgs.unshift({ id: generateId(), imageUrl: m, caption: userText.replace(UPLOAD_IMG, '').trim(), userName: uName, userAvatar: uAvatar, createdAt: Date.now() }); });
          saveImages(imgs.slice(0, 50));
        }
        if (UPLOAD_NEWS.test(userText)) {
          const news = getNews();
          news.unshift({ id: generateId(), text: cleanText.replace(UPLOAD_NEWS, '').trim(), userName: uName, userAvatar: uAvatar, createdAt: Date.now() });
          saveNews(news.slice(0, 100));
        }
      }
      return { ...c, messages: updated };
    }));
  }, [user]);

  const onThinking = useCallback((chatId: string, id: string, source?: string) => {
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      return { ...c, messages: c.messages.map(m => m.id === id ? { ...m, source } as any : m) };
    }));
  }, []);

  const handleSendMessage = useCallback(async (text: string, editingMsgId?: string, media?: string[]) => {
    if (!activeChatId) return;
    const now = nowTime();
    const chatId = activeChatId;

    setChats(prev => prev.map(c => c.id === chatId ? { ...c, createdAt: Date.now() } : c));

    if (editingMsgId) {
      const thinkingId = generateId();
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c;
        const msgIdx = c.messages.findIndex(m => m.id === editingMsgId);
        if (msgIdx === -1) return c;
        
        // Удаляем все сообщения после редактируемого, включая остановленные
        const newMsgs = c.messages.slice(0, msgIdx + 1);
        newMsgs[msgIdx] = { ...newMsgs[msgIdx], text, time: now, blocked: false };
        
        const thinkingMsg = { id: thinkingId, role: 'thinking' as const, text: '', time: now };
        newMsgs.push(thinkingMsg);
        
        return { ...c, messages: newMsgs };
      }));
      setIsGenerating(true);
      askAnoAI(chatId, text, (id, src) => onThinking(chatId, id, src), (id, res) => processResult(chatId, id, res, text, media), thinkingId, media);
      return;
    }

    const thinkingId = generateId();
    const userMsg = { id: generateId(), role: 'user' as const, text, time: now, media: media && media.length > 0 ? media : undefined };
    const thinkingMsg = { id: thinkingId, role: 'thinking' as const, text: '', time: now };

    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      const isFirst = c.messages.length === 0;
      const title = isFirst ? text.slice(0, 40) + (text.length > 40 ? '...' : '') : c.title;
      return { ...c, title, messages: [...c.messages, userMsg, thinkingMsg] };
    }));

    setIsGenerating(true);
    await askAnoAI(chatId, text, (id, src) => onThinking(chatId, id, src), (id, res) => processResult(chatId, id, res, text, media), thinkingId, media);
  }, [activeChatId, processResult, onThinking]);

  return (
    <div className="flex h-screen w-screen bg-white" style={{ overflow: 'hidden', position: 'fixed', inset: 0 }}>
      <LeftPanel
        chats={chats} activeChatId={activeChatId} user={user} panelOpen={panelOpen}
        onPanelToggle={() => setPanelOpen(p => !p)} onNewChat={createNewChat}
        onSelectChat={id => { setActiveChatId(id); setActiveTab('ai'); }}
        onDeleteChat={id => {
          setChats(prev => prev.filter(c => c.id !== id));
          clearAIHistory(id);
        }}
        onAvatarClick={() => { if (!user) { setAuthMode('login'); setShowAuth(true); } else setShowProfile(true); }}
        onRulesClick={() => window.open('https://moai-policy.up.railway.app/', '_blank')}
      />
      <div className="flex-1 flex flex-col min-w-0 relative bg-white" style={{ overflow: 'hidden' }}>
        <TopBar activeTab={activeTab as any} onTabChange={setActiveTab as any} />
        <div style={{ display: activeTab === 'ai' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, animation: 'fadeIn 0.3s ease', justifyContent: 'center', alignItems: 'center' }}>
          <ChatArea chat={activeChat} onSend={handleSendMessage} user={user} isGenerating={isGenerating} onStop={() => { stopGeneration(); setIsGenerating(false); }} />
        </div>
        {activeTab === 'images' && <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flex: 1, minHeight: 0 }}><ImagesFeed /></div>}
        {activeTab === 'news' && <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flex: 1, minHeight: 0 }}><NewsFeed /></div>}
      </div>
      {showAuth && (
        <AuthModal mode={authMode} onModeChange={setAuthMode}
          onRegister={async (n, e, p) => { const res = await registerUser(n, e, p); if (res.ok) { const u = { name: n, email: e, avatar: null }; setUser(u); saveUser(u); setShowAuth(false); return null; } return res.error || 'Ошибка'; }}
          onLogin={async (e, p) => { const res = await loginUser(e, p); if (res.ok && res.user) { const u = { name: res.user.name, email: e, avatar: res.user.avatar }; setUser(u); saveUser(u); setShowAuth(false); return null; } return res.error || 'Ошибка'; }}
          onClose={() => setShowAuth(false)}
        />
      )}
      {showProfile && user && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)}
          onAvatarChange={a => { const u = { ...user, avatar: a }; setUser(u); saveUser(u); updateUserInDB(user.email, { avatar: a }); }}
          onNameChange={n => { const u = { ...user, name: n }; setUser(u); saveUser(u); updateUserInDB(user.email, { name: n }); }}
          onLogout={() => { setUser(null); saveUser(null); setShowProfile(false); }}
        />
      )}
    </div>
  );
}
