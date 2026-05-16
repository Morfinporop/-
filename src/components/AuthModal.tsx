import { useState } from 'react';

interface Props {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onRegister: (name: string, email: string, password: string) => string | null;
  onLogin: (email: string, password: string) => string | null;
  onClose: () => void;
}

function passwordStrength(pw: string): 'weak' | 'medium' | 'strong' | null {
  if (!pw) return null;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpec = /[^A-Za-z0-9]/.test(pw);
  const score = [pw.length >= 8, hasUpper, hasLower, hasNum, hasSpec].filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

function isGoogleEmail(email: string): boolean {
  return /@gmail\.com$/i.test(email) || /@googlemail\.com$/i.test(email);
}

export default function AuthModal({ mode, onModeChange, onRegister, onLogin, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const strength = mode === 'register' ? passwordStrength(password) : null;

  const strengthColor = strength === 'weak' ? 'rgba(220,80,80,0.8)' :
    strength === 'medium' ? 'rgba(220,180,60,0.8)' :
    strength === 'strong' ? 'rgba(80,200,140,0.8)' : 'rgba(255,255,255,0.3)';

  const strengthGlow = strength === 'weak' ? '0 0 8px rgba(220,80,80,0.4)' :
    strength === 'medium' ? '0 0 8px rgba(220,180,60,0.4)' :
    strength === 'strong' ? '0 0 8px rgba(80,200,140,0.4)' : 'none';

  const handleSubmit = () => {
    setError('');
    if (!email || !password) { setError('Заполните все поля'); return; }
    if (mode === 'register') {
      if (!name) { setError('Введите имя'); return; }
      if (!isGoogleEmail(email)) { setError('Используйте почту Google (@gmail.com)'); return; }
      if (password.length < 8) { setError('Пароль минимум 8 символов'); return; }
      if (strength === 'weak') { setError('Пароль слишком простой'); return; }
      const err = onRegister(name, email, password);
      if (err) setError(err);
    } else {
      const err = onLogin(email, password);
      if (err) setError(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-[28px] px-8 py-8 relative"
        style={{
          background: 'linear-gradient(145deg, #ffffff, #f8f8f8)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-800 mb-8 text-center">
          {mode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
        </h2>

        <div className="flex flex-col gap-7">
          {mode === 'register' && (
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={nameFocused || name ? '' : 'Введите имя'}
                className="w-full bg-transparent outline-none text-sm text-gray-700 pb-1 placeholder-gray-400"
              />
              <div
                className="h-px mt-1 transition-all duration-300"
                style={{ background: nameFocused ? '#888' : 'rgba(0,0,0,0.15)' }}
              />
            </div>
          )}

          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={emailFocused || email ? '' : 'Введите почту'}
              className="w-full bg-transparent outline-none text-sm text-gray-700 pb-1 placeholder-gray-400"
            />
            <div
              className="h-px mt-1 transition-all duration-300"
              style={{ background: emailFocused ? '#888' : 'rgba(0,0,0,0.15)' }}
            />
          </div>

          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={passFocused || password ? '' : 'Введите пароль'}
              className="w-full bg-transparent outline-none text-sm text-gray-700 pb-1 placeholder-gray-400"
            />
            {mode === 'register' ? (
              <div
                className="h-1 mt-1 rounded-full transition-all duration-500"
                style={{
                  background: strengthColor,
                  boxShadow: strengthGlow,
                  width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : strength === 'strong' ? '100%' : '100%'
                }}
              />
            ) : (
              <div
                className="h-px mt-1 transition-all duration-300"
                style={{ background: passFocused ? '#888' : 'rgba(0,0,0,0.15)' }}
              />
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-4 text-center">{error}</p>
        )}

        <div className="flex items-center justify-center gap-5 mt-7">
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200">
            <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="none">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" fill="#5865F2"/>
            </svg>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full mt-5 py-3 rounded-2xl text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #4285f4 0%, #5a9fd4 100%)',
          }}
        >
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        <div className="text-center mt-4">
          {mode === 'login' ? (
            <button
              onClick={() => { onModeChange('register'); setError(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Регистрация
            </button>
          ) : (
            <button
              onClick={() => { onModeChange('login'); setError(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Войти
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
