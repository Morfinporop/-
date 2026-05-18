import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { User } from '../types';

interface Props {
  user: User;
  onClose: () => void;
  onAvatarChange: (a: string) => void;
  onNameChange: (n: string) => void;
  onLogout?: () => void;
}

export default function ProfileModal({ user, onClose, onAvatarChange, onNameChange, onLogout }: Props) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(user.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveN = () => { const c = nameVal.trim().slice(0, 50); if (c) onNameChange(c); else setNameVal(user.name); setEditing(false); };

  return (
    <Dialog.Root open onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/18" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4 rounded-3xl bg-surface border border-border shadow-lg animate-fade-in outline-none overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="cursor-pointer group" onClick={() => fileRef.current?.click()}>
              <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center relative border-2 border-border bg-surface-dim">
                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#bbb" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onLogout && <button onClick={() => { onLogout(); onClose(); }} className="p-2 rounded-xl hover:bg-red-50 transition-colors btn btn-light"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#e74c3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
              <Dialog.Close className="p-2 rounded-xl hover:bg-surface-dim transition-colors btn btn-light">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
              </Dialog.Close>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const res = ev.target?.result as string; if (res) onAvatarChange(res); }; r.readAsDataURL(f); }} />
          <div className="pt-4 pb-7 px-5">
            {editing ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveN(); if (e.key === 'Escape') { setEditing(false); setNameVal(user.name); } }} className="text-base font-semibold text-text bg-transparent outline-none border-b border-border-strong pb-0.5 flex-1" />
                <button onClick={saveN} className="text-xs text-green-600 font-medium">ок</button>
                <button onClick={() => { setEditing(false); setNameVal(user.name); }} className="text-xs text-text-muted">отмена</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text">{user.name}</h3>
                <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-surface-dim transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}
            <p className="text-xs text-text-muted mt-1">{user.email}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
