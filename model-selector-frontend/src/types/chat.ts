export interface MessageFile {
  url: string;
  name?: string;
  type?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: MessageFile[];
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
