import { useState } from 'react';
import { Message } from '../types';

interface Props {
  msg: Message;
  onEditStart: (msg: Message) => void;
}

function cleanMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

function renderHighlighted(text: string, highlights: string[]): React.ReactNode {
  const cleanText = cleanMarkdown(text);
  
  if (!highlights || highlights.length === 0) return cleanText;

  let parts: { text: string; hl: boolean }[] = [{ text: cleanText, hl: false }];

  for (let phrase of highlights) {
    phrase = cleanMarkdown(phrase);
    if (!phrase.trim()) continue;
    const next: typeof parts = [];
    for (const part of parts) {
      if (part.hl) { next.push(part); continue; }
      const idx = part.text.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx === -1) { next.push(part); continue; }
      if (idx > 0) next.push({ text: part.text.slice(0, idx), hl: false });
      next.push({ text: part.text.slice(idx, idx + phrase.length), hl: true });
      const after = part.text.slice(idx + phrase.length);
      if (after) next.push({ text: after, hl: false });
    }
    parts = next;
  }

  return (
    <>
      {parts.map((p, i) =>
        p.hl ? (
          <span
            key={i}
            style={{
              background: 'rgba(66,133,244,0.2)',
              borderRadius: '4px',
              padding: '1px 4px',
            }}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function isMedical(userText: string): boolean {
  const keywords = /боль|болит|болел|вирус|инфекц|температур|кашель|насморк|препарат|лекарство|таблетк|врач|доктор|лечени|больниц|симптом|диагноз|медицин|отит|синусит|аллерги|тошнот|рвот|диаре|голов|перелом|ушиб|давлени|сердц|легк|желуд|печень|почк|кров|анализ/i;
  return keywords.test(userText);
}

function getEmergencyNumber(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz.includes('America')) return '911';
  if (tz.includes('Europe') || tz.includes('Asia') || tz.includes('Africa')) return '112';
  return '911 или 112';
}

export default function MessageBubble({ msg, onEditStart }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(msg.role === 'user' && msg.text.length > 150);
  const [liked, setLiked] = useState<boolean | null>(null);

  if (msg.role === 'thinking') {
    if (msg.isGenerating) {
      return (
        <div className="flex justify-start mb-5">
          <div
            className="w-48 h-48 rounded-xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"
              style={{
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex justify-start mb-5">
        <div className="flex items-center gap-2 px-2 py-2">
          <ThinkingDots />
          <span className="text-xs text-gray-400">думает...</span>
        </div>
      </div>
    );
  }

  if (msg.role === 'user') {
    const displayText = collapsed ? msg.text.slice(0, 150) + '...' : msg.text;
    
    return (
      <div className="flex justify-end mb-5">
        <div className="relative flex flex-col items-end" style={{ maxWidth: '70%' }}>
          <div className="relative">
            <div
              className="px-5 py-3 rounded-[20px] text-sm leading-relaxed"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f4f4f4 100%)',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
                filter: msg.blocked ? 'blur(7px)' : 'none',
                userSelect: msg.blocked ? 'none' : 'auto',
                paddingBottom: '34px',
                paddingRight: msg.text.length > 150 ? '90px' : '80px',
                paddingLeft: '20px',
                wordBreak: 'break-word',
                minWidth: '120px',
                color: '#1f2937',
                textAlign: 'right',
                direction: 'rtl'
              }}
            >
              <span style={{ direction: 'ltr', display: 'inline-block' }}>{displayText}</span>
            </div>
            <div
              className="absolute bottom-2.5 right-3 flex items-center gap-2"
              style={{ pointerEvents: msg.blocked ? 'none' : 'auto' }}
            >
              {!msg.blocked && msg.text.length > 150 && (
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="transition-transform"
                  style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
                >
                  <ChevronDown />
                </button>
              )}
              {!msg.blocked && (
                <button
                  onClick={() => onEditStart(msg)}
                  className="text-xs transition-colors hover:text-gray-600"
                  style={{
                    color: 'rgba(0,0,0,0.3)',
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                  }}
                >
                  изменить
                </button>
              )}
              <span style={{ color: 'rgba(0,0,0,0.25)', fontSize: '10px' }}>{msg.time}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === 'assistant') {
    const userMsgIdx = (window as any).__currentChatMessages?.findIndex((m: Message) => m.id === msg.id);
    const userMsg = userMsgIdx > 0 ? (window as any).__currentChatMessages?.[userMsgIdx - 1] : null;
    const showMedicalWarning = userMsg && userMsg.role === 'user' && isMedical(userMsg.text);

    if (msg.text.startsWith('data:image') || msg.text.startsWith('data:video')) {
      return (
        <div className="flex justify-start mb-5">
          <div style={{ maxWidth: '75%' }}>
            {msg.text.startsWith('data:image') ? (
              <img src={msg.text} alt="Generated" className="max-w-full rounded-xl" />
            ) : (
              <video src={msg.text} controls className="max-w-full rounded-xl" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-start mb-5">
        <div style={{ maxWidth: '75%' }}>
          <div
            className="text-sm text-gray-700 leading-relaxed mb-2"
            style={{ wordBreak: 'break-word', background: 'transparent' }}
          >
            {renderHighlighted(msg.text, msg.highlights || [])}
          </div>
          {showMedicalWarning && (
            <p className="text-xs text-gray-400 mb-2 mt-1">
              Нейросеть не врач, она может писать неправильно. Обратитесь в ближайшую больницу или позвоните {getEmergencyNumber()}.
            </p>
          )}
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => {
                navigator.clipboard.writeText(cleanMarkdown(msg.text));
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Скопировать"
            >
              <CopyIcon />
            </button>
            <button
              onClick={() => {
                const newVal = liked === true ? null : true;
                setLiked(newVal);
                if (newVal === true) {
                  console.log('👍 Feedback: Helpful response', { messageId: msg.id, text: msg.text.slice(0, 100) });
                }
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Нравится"
            >
              <LikeIcon filled={liked === true} />
            </button>
            <button
              onClick={() => {
                const newVal = liked === false ? null : false;
                setLiked(newVal);
                if (newVal === false) {
                  console.log('👎 Feedback: Not helpful response', { messageId: msg.id, text: msg.text.slice(0, 100) });
                }
              }}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Не нравится"
            >
              <DislikeIcon filled={liked === false} />
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              <DotsIcon />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute left-0 top-8 z-50 rounded-xl shadow-xl py-1 bg-white border border-gray-200"
                  style={{ minWidth: '160px' }}
                >
                  <button
                    onClick={() => {
                      const cleanText = cleanMarkdown(msg.text);
                      const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `answer-${Date.now()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Экспортировать в TXT
                  </button>
                  <button
                    onClick={() => {
                      const cleanText = cleanMarkdown(msg.text);
                      const jsonData = {
                        id: msg.id,
                        role: msg.role,
                        text: cleanText,
                        time: msg.time,
                        highlights: msg.highlights || []
                      };
                      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `answer-${Date.now()}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    Экспортировать в JSON
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-end">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #78dca8, #7ecfcf)',
            animation: `bounce ${1.2}s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="#666" strokeWidth="1.5"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#666" strokeWidth="1.5"/>
    </svg>
  );
}

function LikeIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'}>
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" stroke={filled ? '#ef4444' : '#666'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DislikeIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'}>
      <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" stroke={filled ? '#ef4444' : '#666'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.5" fill="#666"/>
      <circle cx="12" cy="12" r="1.5" fill="#666"/>
      <circle cx="12" cy="19" r="1.5" fill="#666"/>
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
