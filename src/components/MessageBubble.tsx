import { useState, useEffect, memo, useContext } from 'react';
import { Message } from '../types';
import { getMessageLike, setMessageLike } from '../store';

interface Props { 
  msg: Message; 
  onEditStart: (msg: Message) => void; 
  chatId?: string;
}

const clean = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, '$1');

// Функция для разделения текста на предложения
const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  
  // Нормализуем текст: заменяем множественные пробелы и переносы строк
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Разделяем по точкам, восклицательным, вопросительным знакам и двоеточиям
  const sentences = normalizedText.split(/(?<=[.!?:])\s+(?=[А-ЯA-Z0-9])/);
  
  // Фильтруем пустые строки и объединяем короткие предложения
  const result: string[] = [];
  let buffer = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    
    // Проверяем, не является ли это сокращением (т.д., т.п., etc.)
    const isAbbreviation = /^[а-яa-z]\.\s*$/i.test(trimmed) || 
                          /^[А-ЯA-Z]\.\s*$/.test(trimmed) ||
                          /^(т\.д\.|т\.п\.|др\.|пр\.|etc\.)/i.test(trimmed);
    
    if (isAbbreviation) {
      // Если это сокращение, добавляем к предыдущему предложению
      if (result.length > 0) {
        result[result.length - 1] += ' ' + trimmed;
      } else if (buffer) {
        buffer += ' ' + trimmed;
      } else {
        buffer = trimmed;
      }
      continue;
    }
    
    // Если предложение очень короткое (меньше 3 слов или 25 символов)
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 3 && trimmed.length < 25 && buffer.length < 60) {
      buffer += (buffer ? ' ' : '') + trimmed;
    } else {
      // Если в буфере что-то есть, добавляем его
      if (buffer) {
        result.push(buffer);
        buffer = '';
      }
      result.push(trimmed);
    }
  }
  
  // Добавляем остаток из буфера
  if (buffer) {
    result.push(buffer);
  }
  
  // Если текст не содержит знаков препинания, разбиваем по запятым или просто на части
  if (result.length === 1 && result[0].length > 80) {
    const longText = result[0];
    // Пробуем разбить по запятым
    const commaParts = longText.split(/(?<=[,;])\s+/);
    if (commaParts.length > 1) {
      return commaParts.map(part => part.trim()).filter(part => part.length > 0);
    }
    
    // Или разбиваем на равные части по ~60 символов
    const chunks: string[] = [];
    for (let i = 0; i < longText.length; i += 60) {
      let chunk = longText.slice(i, i + 60);
      // Стараемся закончить на границе слова
      if (i + 60 < longText.length && !/\s$/.test(chunk) && longText[i + 60] !== ' ') {
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > 40) {
          chunk = chunk.slice(0, lastSpace);
          i -= (60 - lastSpace);
        }
      }
      chunks.push(chunk.trim());
    }
    return chunks;
  }
  
  return result;
};

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
      // Для новых сообщений - плавное появление с интеллектуальным разбиением
      if (displayText.length < msg.text.length) {
        const remainingText = msg.text.slice(displayText.length);
        
        // Определяем размер следующего чанка
        let chunkSize = 0;
        
        // 1. Пробуем найти конец предложения
        const sentenceEndMatch = remainingText.match(/[.!?]\s/);
        if (sentenceEndMatch && sentenceEndMatch.index !== undefined && sentenceEndMatch.index < 80) {
          chunkSize = sentenceEndMatch.index + 2; // Знак препинания + пробел
        } 
        // 2. Или конец абзаца (два переноса строки)
        else if (remainingText.includes('\n\n')) {
          const paragraphEnd = remainingText.indexOf('\n\n');
          chunkSize = paragraphEnd + 2;
        }
        // 3. Или конец строки
        else if (remainingText.includes('\n')) {
          const lineEnd = remainingText.indexOf('\n');
          chunkSize = lineEnd + 1;
        }
        // 4. Или следующую запятую
        else if (remainingText.includes(', ')) {
          const commaEnd = remainingText.indexOf(', ');
          chunkSize = commaEnd + 2;
        }
        // 5. Или следующее слово (примерно 15-25 символов)
        else {
          // Ищем конец слова через 15-25 символов
          const searchStart = Math.min(15, remainingText.length);
          const searchEnd = Math.min(25, remainingText.length);
          
          for (let i = searchStart; i <= searchEnd; i++) {
            if (i >= remainingText.length || remainingText[i] === ' ' || i === searchEnd) {
              chunkSize = i + 1;
              break;
            }
          }
          
          if (chunkSize === 0) {
            chunkSize = Math.min(20, remainingText.length);
          }
        }
        
        // Ограничиваем максимальный размер чанка
        chunkSize = Math.min(chunkSize, remainingText.length);
        
        // Динамическая скорость: быстрее в начале, медленнее в конце
        const progress = displayText.length / msg.text.length;
        let speed = 20; // Базовая скорость (мс)
        
        if (progress < 0.3) {
          speed = 15; // Быстрее в начале
        } else if (progress > 0.7) {
          speed = 35; // Медленнее в конце для драматизма
        }
        
        // Добавляем небольшую случайность для естественности
        const randomVariation = Math.random() * 10 - 5; // ±5 мс
        const finalSpeed = Math.max(10, speed + randomVariation);
        
        const timeout = setTimeout(() => {
          setDisplayText(msg.text.slice(0, displayText.length + chunkSize));
        }, finalSpeed);
        
        return () => clearTimeout(timeout);
      }
    } else if (msg.role === 'assistant') {
      setDisplayText(msg.text);
    }
  }, [msg.text, msg.role, displayText.length]);

  // При открытии старого чата - плавное появление текста предложениями
  useEffect(() => {
    if (msg.role === 'assistant' && msg.text !== '[stopped]' && displayText === '') {
      // Небольшая задержка перед началом анимации для более естественного вида
      const startDelay = setTimeout(() => {
        const sentences = splitIntoSentences(msg.text);
        let currentSentenceIndex = 0;
        let currentText = '';
        
        const animateSentences = () => {
          if (currentSentenceIndex < sentences.length) {
            currentText += (currentText ? ' ' : '') + sentences[currentSentenceIndex];
            setDisplayText(currentText);
            currentSentenceIndex++;
            
            // Задержка между предложениями зависит от длины предложения
            // Более длинные предложения требуют больше времени для "чтения"
            const sentence = sentences[currentSentenceIndex - 1];
            const wordCount = sentence.split(/\s+/).length;
            const baseDelay = Math.max(80, Math.min(400, wordCount * 60));
            
            // Добавляем небольшую случайную вариацию для естественности
            const randomVariation = Math.random() * 40 - 20; // ±20 мс
            const delay = Math.max(60, baseDelay + randomVariation);
            
            setTimeout(animateSentences, delay);
          }
        };
        
        animateSentences();
      }, 200); // Начальная задержка 200 мс
      
      return () => clearTimeout(startDelay);
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
              <div key={i} className="w-2 h-2 rounded-full animate-pulse" 
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.5s'
                }} 
              />
            ))}
          </div>
          <span className="text-xs text-gray-600 font-medium">нейросеть думает...</span>
        </div>
        {(msg as any).source && (
          <div className="text-[10px] text-gray-500 italic ml-0.5">Источник: {(msg as any).source}</div>
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
          <div className="text-sm text-gray-800 leading-relaxed break-words whitespace-pre-wrap">
            {isStopped ? (
              <span className="italic text-gray-400">Запрос остановлен</span>
            ) : (
              displayText.split('\n').map((line, i) => {
                const cleanedLine = clean(line);
                // Подчеркиваем важные части текста синим фоном
                const parts = cleanedLine.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                    {parts.map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        const text = part.slice(2, -2);
                        return <span key={j} className="bg-blue-50 px-1 py-0.5 rounded border border-blue-100">{text}</span>;
                      }
                      return <span key={j}>{part}</span>;
                    })}
                  </p>
                );
              })
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
