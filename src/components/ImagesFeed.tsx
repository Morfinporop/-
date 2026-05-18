import { useState, useEffect, useContext } from 'react';
import { User } from '../types';

interface ImagePost {
  id: string;
  imageUrl: string;
  caption: string;
  userName: string;
  userAvatar: string | null;
  createdAt: number;
}

const STORAGE_KEY = 'moai_images';

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

export default function ImagesFeed({ user }: Props) {
  const [images, setImages] = useState<ImagePost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadImagesFromDB = async () => {
    try {
      const res = await fetch('/api/load-images');
      const data = await res.json();
      if (data.ok && data.images) {
        setImages(data.images);
      } else {
        // Fallback to localStorage
        try {
          const r = localStorage.getItem(STORAGE_KEY);
          if (r) setImages(JSON.parse(r));
        } catch {}
      }
    } catch (error) {
      // Fallback to localStorage
      try {
        const r = localStorage.getItem(STORAGE_KEY);
        if (r) setImages(JSON.parse(r));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!user || user.email !== 'energoferon41@gmail.com') {
      alert('Только администратор может удалять картинки');
      return;
    }

    if (confirm('Удалить эту картинку?')) {
      try {
        const res = await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId, userEmail: user.email })
        });
        const data = await res.json();
        if (data.ok) {
          loadImagesFromDB();
        } else {
          alert(data.error || 'Ошибка удаления');
        }
      } catch (error) {
        alert('Ошибка удаления');
      }
    }
  };

  useEffect(() => {
    loadImagesFromDB();
    const interval = setInterval(loadImagesFromDB, 10000); // Обновляем каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user?.email === 'energoferon41@gmail.com';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce bg-gray-400" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map(img => (
              <div key={img.id} className="rounded-xl overflow-hidden animate-fade-in relative group" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {isAdmin && (
                  <button
                    onClick={() => deleteImage(img.id)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Удалить (только для администратора)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
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
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="mt-2 text-sm">Нет загруженных картинок</p>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 py-4 bg-transparent text-center border-t border-gray-100/50">
        <p className="text-[11px] text-gray-500">Чтобы добавить изображение напишите <span className="font-bold text-gray-600">"загрузи в картинки"</span></p>
        {isAdmin && (
          <p className="text-[10px] text-red-500 mt-1">Вы администратор: можете удалять картинки</p>
        )}
      </div>
    </div>
  );
}
