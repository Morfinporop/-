import { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, User } from '../types';
import MessageBubble from './MessageBubble';

interface Props {
  chat: Chat | null;
  onSend: (text: string, editingMsgId?: string, media?: string[]) => void;
  user: User | null;
  isGenerating?: boolean;
  onStop?: () => void;
}

function greet(name: string) {
  const h = new Date().getHours();
  const u = name || 'Гость';
  if (h >= 5 && h < 12) return `Доброе утро, ${u}`;
  if (h >= 12 && h < 18) return `Добрый день, ${u}`;
  if (h >= 18 && h < 23) return `Добрый вечер, ${u}`;
  return `Доброй ночи, ${u}`;
}

export default function ChatArea({ chat, onSend, user, isGenerating, onStop }: Props) {
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [slide, setSlide] = useState(false);
  const [media, setMedia] = useState<string[]>([]);
  const ta = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const fi = useRef<HTMLInputElement>(null);
  const msgs = chat?.messages || [];
  const hasText = input.trim().length > 0;

  useEffect(() => { (window as any).__currentChatMessages = msgs; }, [msgs]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { if (editId) ta.current?.focus(); }, [editId]);

  const send = useCallback(() => {
    if (isGenerating) return; // Запрещаем отправку, если нейросеть генерирует
    const t = input.trim();
    if (!t && !media.length) return;
    if (editId) { onSend(t, editId); setEditId(null); }
    else { onSend(t, undefined, media.length ? media : undefined); }
    setInput(''); setMedia([]);
    setSlide(true); setTimeout(() => setSlide(false), 300);
  }, [input, editId, media, onSend, isGenerating]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => {
      if (f.type.startsWith('image/')) {
        const r = new FileReader();
        r.onload = ev => { if (ev.target?.result) setMedia(p => [...p, ev.target!.result as string]); };
        r.readAsDataURL(f);
      }
    });
    if (fi.current) fi.current.value = '';
  };

  const started = msgs.length > 0;

  const inputBox = (
    <div className="relative rounded-3xl bg-white border border-gray-200 shadow-sm transition-all duration-300 w-full" style={{ transform: slide ? 'translateY(6px)' : '', opacity: slide ? 0.6 : 1 }}>
      <div className="relative z-[1] flex flex-col px-4 pt-3 pb-2">
        {media.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{media.map((f, i) => <div key={i} className="relative group"><img src={f} className="w-20 h-20 object-cover rounded-xl" /><button onClick={() => setMedia(p => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold bg-black/50 hover:bg-black/70 transition-colors">×</button></div>)}</div>}
        <textarea ref={ta} value={input}
          onChange={e => { const v = e.target.value; if (v.length > 4000) return; setInput(v.replace(/[\u0300-\u036f\u0483-\u0489]/g, '')); if (editId && !v.trim()) setEditId(null); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Пишите пожелание" rows={1}
          className="w-full bg-transparent outline-none resize-none text-sm text-gray-800 leading-relaxed min-h-[36px] max-h-[120px]"
        />
        <div className="flex items-center justify-between mt-1.5 min-h-[36px]">
          <button onClick={() => fi.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors" title="Прикрепить фото">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#555" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div className="flex items-center gap-2">
            {editId && <button onClick={() => { setEditId(null); setInput(''); }} className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">Отменить</button>}
            {isGenerating && !editId ? (
              <div className="relative">
                <button onClick={onStop} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center relative overflow-hidden">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse"></div>
                </button>
              </div>
            ) : (
              <button onClick={send} disabled={!hasText && !media.length} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center transition-opacity disabled:opacity-25 disabled:cursor-default"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round"/><path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            )}
          </div>
        </div>
      </div>
      <input ref={fi} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
    </div>
  );

  return (
    <div className="flex flex-col w-full max-w-[850px] mx-auto h-full min-h-0">
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12 animate-fade-in">
          <div className="mb-6 transition-all duration-500" style={{ opacity: slide ? 0 : 1, transform: slide ? 'translateY(-16px)' : '' }}>
            <h1 className="text-3xl font-semibold text-gray-800 text-center">{greet(user?.name || '')}</h1>
          </div>
          <div className="w-full max-w-[800px]">{inputBox}</div>
          <p className="text-center text-xs text-gray-500 mt-3">Нейросеть может ошибаться!</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {msgs.map(m => <MessageBubble key={m.id} msg={m} chatId={chat?.id} onEditStart={m => { setEditId(m.id); setInput(m.text); setTimeout(() => ta.current?.focus(), 50); }} />)}
            <div ref={end} />
          </div>
          <div className="px-4 pb-2 pt-0 flex-shrink-0 w-full max-w-[800px] mx-auto">
            {inputBox}
            <p className="text-center text-xs text-gray-500 mt-1.5 mb-0.5">Нейросеть может ошибаться!</p>
          </div>
        </>
      )}
    </div>
  );
}
