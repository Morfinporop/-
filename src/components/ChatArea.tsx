import { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, Message, User } from '../types';
import MessageBubble from './MessageBubble';

interface Props {
  chat: Chat | null;
  onSend: (text: string, editingMsgId?: string) => void;
  user: User | null;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const userName = name || 'Гость';
  if (hour >= 5 && hour < 12) return `Доброе утро, ${userName}`;
  if (hour >= 12 && hour < 18) return `Добрый день, ${userName}`;
  if (hour >= 18 && hour < 23) return `Добрый вечер, ${userName}`;
  return `Доброй ночи, ${userName}`;
}

const MAX_INPUT_LENGTH = 4000;

export default function ChatArea({ chat, onSend, user }: Props) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [inputSlideDown, setInputSlideDown] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGlow, setShowGlow] = useState(true);

  const messages = chat?.messages || [];
  const hasInput = input.trim().length > 0;

  useEffect(() => {
    (window as any).__currentChatMessages = messages;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setHasStarted(true);
    } else {
      setHasStarted(false);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (editingMsgId) {
      textareaRef.current?.focus();
    }
  }, [editingMsgId]);

  const triggerGlowTimer = useCallback(() => {
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    setShowGlow(false);
    glowTimerRef.current = setTimeout(() => {
      setShowGlow(true);
    }, 25000);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      setShowGlow(true);
    } else {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant') {
        triggerGlowTimer();
      }
    }
  }, [messages, triggerGlowTimer]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    setHasStarted(true);

    if (editingMsgId) {
      onSend(text, editingMsgId);
      setEditingMsgId(null);
    } else {
      onSend(text);
    }
    setInput('');

    setInputSlideDown(true);
    setTimeout(() => setInputSlideDown(false), 350);
  }, [input, editingMsgId, onSend]);

  const handleEditStart = useCallback((msg: Message) => {
    setEditingMsgId(msg.id);
    setInput(msg.text);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMsgId(null);
    setInput('');
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = () => {
    setFocused(true);
    setShowGlow(false);
    if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_INPUT_LENGTH) return;
    const clean = val.replace(/[\u0300-\u036f\u0483-\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, '');
    setInput(clean);
    if (editingMsgId && clean.trim() === '') {
      setEditingMsgId(null);
    }
  };

  const centerMode = !hasStarted;

  return (
    <div className="flex flex-col h-full" style={{ maxWidth: centerMode ? '100%' : '900px', margin: '0 auto', width: '100%' }}>
      {centerMode ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
          <div
            className="mb-8 transition-all duration-500"
            style={{
              opacity: inputSlideDown ? 0 : 1,
              transform: inputSlideDown ? 'translateY(-30px)' : 'translateY(0)',
            }}
          >
            <h1 className="text-4xl font-semibold text-gray-800 text-center">
              {getGreeting(user?.name || '')}
            </h1>
          </div>

          <div
            className="w-full max-w-2xl relative rounded-[32px]"
            style={{
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
              transform: inputSlideDown ? 'translateY(10px)' : 'translateY(0)',
              opacity: inputSlideDown ? 0.6 : 1,
              transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
            }}
          >
            {showGlow && !focused && <GlowRing />}

            <div className="flex flex-col px-5 pt-4 pb-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Пишите пожелание"
                rows={2}
                className="w-full bg-transparent outline-none resize-none text-sm text-gray-700 leading-relaxed"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                  fontFamily: 'inherit',
                  color: '#333',
                }}
              />
              <div className="flex items-center justify-end mt-2 min-h-[32px] gap-2">
                {editingMsgId && (focused || hasInput) && (
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100"
                  >
                    Отменить
                  </button>
                )}
                {(focused || hasInput) && <SendButton onClick={handleSend} />}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">Нейросеть может ошибаться!</p>
        </div>
      ) : (
        <>
          <div
            className="flex-1 overflow-y-auto px-8 py-6"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.08) transparent', maxWidth: '900px', margin: '0 auto', width: '100%' }}
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onEditStart={handleEditStart}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-6 pb-3 pt-0 flex-shrink-0" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <div
              className="relative rounded-[32px]"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 20px rgba(0,0,0,0.05)',
                transform: inputSlideDown ? 'translateY(10px)' : 'translateY(0)',
                opacity: inputSlideDown ? 0.6 : 1,
                transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
              }}
            >
              {showGlow && !focused && <GlowRing />}

              <div className="flex flex-col px-5 pt-4 pb-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder="Пишите пожелание"
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none text-sm text-gray-700 leading-relaxed"
                  style={{
                    minHeight: '48px',
                    maxHeight: '120px',
                    fontFamily: 'inherit',
                    color: '#333',
                  }}
                />
                <div className="flex items-center justify-between mt-2 min-h-[32px]">
                  <div>
                    {editingMsgId && (focused || hasInput) && (
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100"
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                  {(focused || hasInput) && <SendButton onClick={handleSend} />}
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2 mb-0.5">Нейросеть может ошибаться!</p>
          </div>
        </>
      )}
    </div>
  );
}

function GlowRing() {
  return (
    <>
      <div
        className="absolute inset-0 rounded-[32px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #e07878 0%, #78dca8 25%, #7ecfcf 50%, #d4c5a0 75%, #e07878 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradientFlow 3s linear infinite',
          padding: '2px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
        }}
      />
      <div
        className="absolute inset-0 rounded-[32px] pointer-events-none"
        style={{
          boxShadow: '0 0 20px rgba(224,120,120,0.25), 0 0 30px rgba(120,220,168,0.15)',
        }}
      />
    </>
  );
}

function SendButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-xl relative overflow-hidden flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
      style={{ width: '38px', height: '38px' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #4285f4 0%, #5a9fd4 100%)',
          borderRadius: '12px',
        }}
      />
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
