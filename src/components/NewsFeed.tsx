import { useState, useEffect } from 'react';
import { User } from '../types';

interface NewsPost {
  id: string;
  text: string;
  userName: string;
  userAvatar: string | null;
  createdAt: number;
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

interface Props {
  user?: User | null;
}

export default function NewsFeed({ user }: Props) {
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNewsFromDB = async () => {
    try {
      const res = await fetch('/api/load-news');
      const data = await res.json();
      if (data.ok && data.news) {
        setNews(data.news);
      } else {
        // Fallback to localStorage
        try {
          const r = localStorage.getItem('moai_news');
          if (r) setNews(JSON.parse(r));
        } catch {}
      }
    } catch (error) {
      // Fallback to localStorage
      try {
        const r = localStorage.getItem('moai_news');
        if (r) setNews(JSON.parse(r));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const deleteNews = async (newsId: string) => {
    if (!user || user.email !== 'energoferon41@gmail.com') {
      alert('Только администратор может удалять новости');
      return;
    }

    if (confirm('Удалить эту новость?')) {
      try {
        const res = await fetch('/api/delete-news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsId, userEmail: user.email })
        });
        const data = await res.json();
        if (data.ok) {
          loadNewsFromDB();
        } else {
          alert(data.error || 'Ошибка удаления');
        }
      } catch (error) {
        alert('Ошибка удаления');
      }
    }
  };

  useEffect(() => {
    loadNewsFromDB();
    const interval = setInterval(loadNewsFromDB, 10000); // Обновляем каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user?.email === 'energoferon41@gmail.com';

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : news.length > 0 ? (
          <div className="flex flex-col gap-3">
            {news.map(n => (
              <div key={n.id} className="rounded-xl p-4 animate-fade-in relative group" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                {isAdmin && (
                  <button
                    onClick={() => deleteNews(n.id)}
                    className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Удалить (только для администратора)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {n.userAvatar ? <img src={n.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-black/5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#aaa" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round"/></svg></div>}
                  <span className="text-xs font-medium text-gray-600">{n.userName}</span>
                  <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex-shrink-0 py-4 text-center">
        <p className="text-[11px] text-gray-500">Чтобы добавить новости напишите <span className="font-bold text-gray-600">"загрузи в новости"</span></p>
        {isAdmin && (
          <p className="text-[10px] text-red-500 mt-1">Вы администратор: можете удалять новости</p>
        )}
      </div>
    </div>
  );
}
