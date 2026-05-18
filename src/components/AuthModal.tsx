import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface Props {
  mode: 'login' | 'register';
  onModeChange: (m: 'login' | 'register') => void;
  onRegister: (n: string, e: string, p: string) => Promise<string | null>;
  onLogin: (e: string, p: string) => Promise<string | null>;
  onClose: () => void;
}

function strength(pw: string) {
  if (!pw) return null;
  const s = [pw.length >= 8, /[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return s <= 2 ? 'weak' : s <= 3 ? 'medium' : 'strong';
}

export default function AuthModal({ mode, onModeChange, onRegister, onLogin, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const s = mode === 'register' ? strength(password) : null;

  const submit = async () => {
    setError('');
    if (!email || !password) { setError('Заполните все поля'); return; }
    if (mode === 'register' && !name) { setError('Введите имя'); return; }
    if (mode === 'register' && password.length < 8) { setError('Пароль минимум 8 символов'); return; }
    setLoading(true);
    const err = mode === 'register' ? await onRegister(name, email, password) : await onLogin(email, password);
    setLoading(false);
    if (err) setError(err);
  };

  const kd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

  return (
    <Dialog.Root open onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/18" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4 rounded-3xl p-7 bg-white border border-gray-200 shadow-lg animate-fade-in outline-none">
          <Dialog.Close className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/></svg>
          </Dialog.Close>
          <Dialog.Title className="text-lg font-semibold text-gray-800 mb-7 text-center">{mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}</Dialog.Title>
          <div className="flex flex-col gap-6">
            {mode === 'register' && (
              <div>
                <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={kd} placeholder="Введите имя" className="w-full bg-transparent outline-none text-sm text-gray-800 pb-1 placeholder:text-gray-500" />
                <div className="h-px mt-1 bg-gray-300" />
              </div>
            )}
            <div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={kd} placeholder="Введите почту" className="w-full bg-transparent outline-none text-sm text-gray-800 pb-1 placeholder:text-gray-500" />
              <div className="h-px mt-1 bg-gray-300" />
            </div>
            <div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={kd} placeholder="Введите пароль" className="w-full bg-transparent outline-none text-sm text-gray-800 pb-1 placeholder:text-gray-500" />
              {mode === 'register' ? (
                <div className="h-1 mt-1 rounded-full transition-all duration-300" style={{ background: s === 'weak' ? '#e05050' : s === 'medium' ? '#d4a020' : s === 'strong' ? '#40b870' : '#eee', width: s === 'weak' ? '33%' : s === 'medium' ? '66%' : '100%' }} />
              ) : (
                <div className="h-px mt-1 bg-gray-300" />
              )}
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-4 text-center">{error}</p>}
          <div className="flex justify-center mt-6">
            <button onClick={() => window.open('/api/auth/steam', '_self')} className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100">
              <svg width="20" height="20" viewBox="0 0 256 259" fill="none">
                <path d="M127.779 0C57.895 0 1.307 53.477.079 122.252l68.766 28.429c5.851-4.004 12.891-6.356 20.475-6.356.679 0 1.349.028 2.014.068l30.624-44.36v-.658c0-26.514 21.574-48.086 48.098-48.086 26.516 0 48.098 21.585 48.098 48.116 0 26.531-21.582 48.115-48.098 48.115-.6 0-1.188-.023-1.777-.053l-43.624 31.139c.025.548.048 1.091.048 1.644 0 19.897-16.18 36.075-36.085 36.075-17.68 0-32.39-12.756-35.473-29.57L1.715 155.123C14.647 213.073 66.126 256.33 127.779 256.33c71.287 0 129.091-57.793 129.091-129.164C256.87 55.798 199.066 0 127.779 0z" fill="#1b2838"/>
                <path d="M81.281 197.992l-15.612-6.452c2.769 5.761 7.673 10.412 14.041 12.762 13.795 5.089 29.087-2.058 34.176-15.849 2.467-6.688 2.432-14.03-.098-20.741-2.524-6.709-7.581-11.961-14.264-14.427-6.615-2.437-13.523-2.167-19.458.335l16.134 6.672c10.18 4.215 15.018 15.89 10.807 26.073-4.213 10.181-15.89 15.017-26.073 10.806l.347-.179z" fill="#fff"/>
                <path d="M215.366 149.381c0-20.673-16.826-37.498-37.511-37.498-20.672 0-37.498 16.825-37.498 37.498 0 20.685 16.826 37.51 37.498 37.51 20.685 0 37.511-16.825 37.511-37.51zm-63.717.087c0-14.485 11.754-26.24 26.234-26.24 14.493 0 26.247 11.755 26.247 26.24 0 14.498-11.754 26.252-26.247 26.252-14.48 0-26.234-11.754-26.234-26.252z" fill="#fff"/>
              </svg>
            </button>
          </div>
          <button onClick={submit} disabled={loading} className="w-full mt-5 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-to-br from-gray-800 to-black disabled:opacity-50">
            {loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          <div className="text-center mt-4">
            <button onClick={() => { onModeChange(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
              {mode === 'login' ? 'Регистрация' : 'Войти'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
