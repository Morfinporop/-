import { useState, useEffect } from 'react';

interface ImagePost {
  id: string;
  imageUrl: string;
  caption: string;
  userName: string;
  userAvatar: string | null;
  createdAt: number;
}

const STORAGE_KEY = 'moai_images';

function loadImages(): ImagePost[] {
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

export default function ImagesFeed() {
  const [images, setImages] = useState<ImagePost[]>([]);

  useEffect(() => {
    setImages(loadImages());
    const interval = setInterval(() => setImages(loadImages()), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {images.map(img => (
              <div key={img.id} className="rounded-xl overflow-hidden animate-fade-in" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <img src={img.imageUrl} alt="" className="w-full h-48 object-cover" loading="lazy" />
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {img.userAvatar ? (
                      <img src={img.userAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-black/5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#aaa" strokeWidth="1.6"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </div>
                    )}
                    <span className="text-xs font-semibold text-gray-700">{img.userName}</span>
                    <span className="text-[10px] text-gray-400 font-medium ml-auto">{timeAgo(img.createdAt)}</span>
                  </div>
                  {img.caption && <p className="text-xs text-gray-500 leading-snug">{img.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex-shrink-0 py-4 bg-transparent text-center border-t border-gray-100/50">
        <p className="text-[11px] text-text-muted">Чтоб добавить изображение напишите <span className="font-bold text-gray-400">"Загрузи в картинки"</span></p>
      </div>
    </div>
  );
}
