import { useState, useEffect, memo, useContext } from 'react';
import { Message } from '../types';
import { getMessageLike, setMessageLike } from '../store';

interface Props { 
  msg: Message; 
  onEditStart: (msg: Message) => void; 
  chatId?: string;
}

const clean = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, '$1');

export default memo(function MessageBubble({ msg, onEditStart, chatId }: Props) {
  const [displayText, setDisplayText] = useState(msg.role === 'assistant' ? '' : msg.text);
  const [liked, setLiked] = useState<boolean | null>(() => {
    if (chatId && msg.role === 'assistant') {
      return getMessageLike(chatId, msg.id);
    }
    return null;
  });
  const [collapsed, setCollapsed] = useState(msg.role === 'user' && msg.text.length > 200);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (msg.role === 'assistant' && msg.text !== '[stopped]') {
      // Для новых сообщений - плавное появление
      if (displayText.length < msg.text.length) {
        const timeout = setTimeout(() => {
          setDisplayText(msg.text.slice(0, displayText.length + 10));
        }, 10);
        return () => clearTimeout(timeout);
      }
    } else if (msg.role === 'assistant') {
      setDisplayText(msg.text);
    }
  }, [msg.text, msg.role, displayText.length]);

  // При открытии старого чата - плавное появление текста
  useEffect(() => {
    if (msg.role === 'assistant' && msg.text !== '[stopped]' && displayText === '') {
      let currentIndex = 0;
      const textLength = msg.text.length;
      const speed = Math.max(5, Math.min(20, Math.floor(textLength / 50))); // Адаптивная скорость
      
      const animateText = () => {
        if (currentIndex < textLength) {
          setDisplayText(msg.text.slice(0, currentIndex + 1));
          currentIndex++;
          setTimeout(animateText, 20); // Более плавная анимация
        }
      };
      
      animateText();
    }
  }, [msg.id]); // Запускаем только при первом рендере сообщения

  const handleLike = (value: boolean | null) => {
    setLiked(value);
    if (chatId) {
      setMessageLike(chatId, msg.id, value);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(clean(msg.text));
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  if (msg.role === 'thinking') return (
    <div className="flex justify-start mb-3 animate-fade-in">
      <div className="flex flex-col gap-1 px-3 py-1">
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" 
                style={{ background: '#1a1a1a', animationDelay: `${i * 0.2}s` }} 
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">анализирую...</span>
        </div>
        {(msg as any).source && (
          <div className="text-[9px] text-gray-500 italic ml-0.5">Источник: {(msg as any).source}</div>
        )}
      </div>
    </div>
  );

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="flex flex-col items-end max-w-[85%]">
          {msg.media?.length && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {msg.media.map((f, i) => <img key={i} src={f} loading="lazy" className="max-w-[200px] max-h-[200px] object-cover rounded-xl shadow-sm" />)}
            </div>
          )}
          <div className="relative group">
            <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed bg-gray-50 border border-gray-200 shadow-sm text-gray-800 pb-7 transition-all" style={{ minWidth: '100px', width: 'fit-content' }}>
              <span style={{ direction: 'ltr', display: 'inline-block', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{collapsed ? msg.text.slice(0, 200) + '...' : msg.text}</span>
            </div>
            <div className="absolute bottom-1.5 right-3 flex items-center gap-2">
              {!msg.blocked && msg.text.length > 200 && <button onClick={() => setCollapsed(!collapsed)} className="p-0.5 hover:bg-gray-100 rounded transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
              {!msg.blocked && <button onClick={() => onEditStart(msg)} className="text-[10px] text-gray-600 hover:text-gray-800 font-medium">изменить</button>}
              <span className="text-[9px] text-gray-400 font-mono">{msg.time}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === 'assistant') {
    const isStopped = msg.text === '[stopped]';
    const isMed = /врач|доктор|лекарство|таблетк|капл|мазь|терапевт|симптомы/i.test(msg.text);
    
    return (
      <div className="flex justify-start mb-4 animate-fade-in">
        <div className="max-w-[85%]">
          <div className="text-sm text-blue-600 leading-relaxed break-words whitespace-pre-wrap">
            {isStopped ? (
              <span className="italic text-gray-400">Запрос остановлен</span>
            ) : (
              displayText.split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{clean(line)}</p>)
            )}
          </div>
          {isMed && !isStopped && <p className="text-[10px] text-gray-500 mt-2 border-l-2 border-gray-200 pl-2">Нейросеть не врач, она может ошибаться. Обратитесь к специалисту.</p>}
          {!isStopped && (
            <div className="flex items-center gap-1 mt-2 relative">
              <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {copied ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
              </button>
              <button onClick={() => handleLike(liked === true ? null : true)} className="p-1.5 rounded-lg hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={liked===true?'#22c55e':'#888'} strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" fill={liked===true?'#22c55e':'none'}/></svg></button>
              <button onClick={() => handleLike(liked === false ? null : false)} className="p-1.5 rounded-lg hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={liked===false?'#ef4444':'#888'} strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" fill={liked===false?'#ef4444':'none'}/></svg></button>
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-gray-100"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 bg-white border border-gray-200 min-w-[150px] animate-fade-in">
                    <button onClick={() => { const b = new Blob([clean(msg.text)], { type: 'text/plain;charset=utf-8' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'answer.txt'; a.click(); setMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">Экспорт TXT</button>
                    <button onClick={() => { const j = JSON.stringify({ text: clean(msg.text), time: msg.time }, null, 2); const b = new Blob([j], { type: 'application/json;charset=utf-8' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'answer.json'; a.click(); setMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">Экспорт JSON</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
});
