import { Chat, User } from './types';

const CHATS_KEY = 'ano_chats';
const USER_KEY = 'ano_user';
const API_URL = window.location.origin + '/api';

export async function loadChats(userEmail?: string | null): Promise<Chat[]> {
  // Для гостей не загружаем из базы данных
  if (!userEmail) {
    try {
      const raw = localStorage.getItem(CHATS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch { return []; }
  }
  
  // Для авторизованных пользователей загружаем из базы данных
  try {
    const res = await fetch(`${API_URL}/load-chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail })
    });
    const data = await res.json();
    if (data.ok && data.chats) {
      return data.chats;
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveChats(chats: Chat[], userEmail?: string | null) {
  // Для гостей сохраняем только локально
  if (!userEmail) {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    return;
  }
  
  // Для авторизованных пользователей сохраняем в базу данных
  try {
    for (const chat of chats) {
      await fetch(`${API_URL}/save-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat, userEmail })
      });
    }
  } catch (error) {
    console.error('Ошибка сохранения чатов в базу данных:', error);
  }
}

export function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveUser(user: User | null) {
  if (!user) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
}

export async function registerUser(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Ошибка подключения к серверу' };
  }
}

export async function loginUser(email: string, password: string): Promise<{ ok: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'Ошибка подключения к серверу' };
  }
}

export function updateUserInDB(email: string, updates: any) {
  fetch(`${API_URL}/update-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...updates })
  }).catch(() => {});
}


const LIKES_KEY = 'ano_likes';

export interface LikeData {
  chatId: string;
  messageId: string;
  liked: boolean | null; // true = лайк, false = дизлайк, null = нет оценки
}

export function loadLikes(): LikeData[] {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveLikes(likes: LikeData[]) {
  localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
}

export function getMessageLike(chatId: string, messageId: string): boolean | null {
  const likes = loadLikes();
  const like = likes.find(l => l.chatId === chatId && l.messageId === messageId);
  return like ? like.liked : null;
}

export function setMessageLike(chatId: string, messageId: string, liked: boolean | null) {
  const likes = loadLikes();
  const index = likes.findIndex(l => l.chatId === chatId && l.messageId === messageId);
  
  if (index >= 0) {
    if (liked === null) {
      likes.splice(index, 1);
    } else {
      likes[index].liked = liked;
    }
  } else if (liked !== null) {
    likes.push({ chatId, messageId, liked });
  }
  
  saveLikes(likes);
}


export async function deleteChatFromDB(chatId: string, userEmail?: string | null) {
  if (!userEmail) return;
  
  try {
    await fetch(`${API_URL}/delete-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, userEmail })
    });
  } catch (error) {
    console.error('Ошибка удаления чата из базы данных:', error);
  }
}