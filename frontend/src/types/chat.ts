export interface FileItem {
  type: 'image' | 'file';
  url: string;
  name?: string;
  content_type?: string;
  size?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: FileItem[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
  rawData?: any;
  isSaved?: boolean;
}

export const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'groq.llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Fast and efficient Llama model',
    enabled: true,
  },
  {
    id: 'jupiterbrains',
    name: 'JupiterBrains (On Prem)',
    description: 'Domain-aware SLM deployed on-premise',
    enabled: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude model',
    enabled: true,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini model',
    enabled: true,
  },
];
