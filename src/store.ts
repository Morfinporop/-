import { Chat, User } from './types';

const CHATS_KEY = 'ano_chats';
const USER_KEY = 'ano_user';

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUser(user: User | null) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
}

const API_URL = window.location.origin + '/api';

export async function registerUser(name: string, email: string, password: string) {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Register error:', err);
    return { ok: false, error: 'Ошибка подключения к серверу' };
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Login error:', err);
    return { ok: false, error: 'Ошибка подключения к серверу' };
  }
}


export function updateUserInDB(email: string, updates: Partial<StoredUser>) {
  const users = loadUsersDB();
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    saveUsersDB(users);
  }
}
