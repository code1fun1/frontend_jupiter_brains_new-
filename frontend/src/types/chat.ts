export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
}

export const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'jupiterbrains',
    name: 'JupiterBrains (On Prem)',
    description: 'Domain-aware SLM deployed on-premise',
    enabled: true,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI GPT-4 model',
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
  {
    id: 'random',
    name: 'Random',
    description: 'Randomly select a model',
    enabled: true,
  },
];
