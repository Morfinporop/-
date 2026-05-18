import { useState, useEffect } from 'react';

interface NewsPost {
  id: string;
  text: string;
  userName: string;
  userAvatar: string | null;
  createdAt: number;
}

const STORAGE_KEY = 'moai_news';

function loadNews(): NewsPost[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsPost[]>([]);

  useEffect(() => {
    setNews(loadNews());
    const interval = setInterval(() => setNews(loadNews()), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        {news.length > 0 && (
          <div className="flex flex-col gap-3">
            {news.map(n => (
              <div key={n.id} className="rounded-xl p-4 animate-fade-in" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  {n.userAvatar ? <img src={n.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-black/5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#aaa" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round"/></svg></div>}
                  <span className="text-xs font-medium text-gray-600">{n.userName}</span>
                  <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 py-4 text-center">
        <p className="text-[11px] text-text-muted">Чтоб добавить Новости напишите <span className="font-bold text-gray-400">"Загрузи в новости"</span></p>
      </div>
    </div>
  );
}
