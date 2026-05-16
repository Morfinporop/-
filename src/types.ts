export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'thinking';
  text: string;
  time: string;
  blocked?: boolean;
  highlights?: string[];
  isEditing?: boolean;
  media?: string[];
  isGenerating?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface User {
  name: string;
  email: string;
  avatar: string | null;
}
