import { useState, useRef } from 'react';
import { User } from '../types';

interface Props {
  user: User;
  onClose: () => void;
  onAvatarChange: (avatar: string) => void;
  onNameChange: (name: string) => void;
  onLogout?: () => void;
}

const MAX_NAME_LENGTH = 50;

export default function ProfileModal({ user, onClose, onAvatarChange, onNameChange, onLogout }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      if (result) onAvatarChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleNameSave = () => {
    const cleaned = nameVal.trim().slice(0, MAX_NAME_LENGTH).replace(/[\u0300-\u036f\u0483-\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, '');
    if (cleaned) {
      onNameChange(cleaned);
    } else {
      setNameVal(user.name);
    }
    setEditingName(false);
  };

  const handleNameChange = (val: string) => {
    if (val.length > MAX_NAME_LENGTH) return;
    const cleaned = val.replace(/[\u0300-\u036f\u0483-\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g, '');
    setNameVal(cleaned);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-[28px] overflow-hidden relative"
        style={{
          background: 'linear-gradient(145deg, #ffffff, #f8f8f8)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <div
            className="cursor-pointer group"
            onClick={handleAvatarClick}
          >
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center relative"
              style={{
                border: '2px solid rgba(0,0,0,0.09)',
                background: 'linear-gradient(135deg, #f0f0f0, #e0e0e0)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
              }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="#bbb" strokeWidth="1.5"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Выйти из аккаунта"
              >
                <LogoutIcon />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <div className="pt-4 pb-8 px-6">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameVal}
                onChange={e => handleNameChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditingName(false); setNameVal(user.name); } }}
                className="text-base font-semibold text-gray-800 bg-transparent outline-none border-b border-gray-300 pb-0.5 flex-1"
              />
              <button onClick={handleNameSave} className="text-xs text-green-500 hover:text-green-700 font-medium">сохранить</button>
              <button onClick={() => { setEditingName(false); setNameVal(user.name); }} className="text-xs text-gray-400 hover:text-gray-600">отмена</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-800">{user.name}</h3>
              <button
                onClick={() => setEditingName(true)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">{user.email}</p>
        </div>
      </div>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#e74c3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
