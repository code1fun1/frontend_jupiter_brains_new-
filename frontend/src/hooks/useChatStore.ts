import { useState, useCallback, useEffect } from 'react';
import { Message, ChatSession, AIModel, DEFAULT_MODELS } from '@/types/chat';

const generateId = () => Math.random().toString(36).substring(2, 15);

const BACKEND_BASE_URL =
  (import.meta as any)?.env?.VITE_BACKEND_BASE_URL && typeof (import.meta as any).env.VITE_BACKEND_BASE_URL === 'string'
    ? (import.meta as any).env.VITE_BACKEND_BASE_URL.replace(/"/g, '').trim().replace(/\/$/, '')
    : 'http://localhost:8081';

const USE_VITE_PROXY =
  typeof (import.meta as any).env?.VITE_USE_VITE_PROXY === 'string'
    ? (import.meta as any).env.VITE_USE_VITE_PROXY.replace(/"/g, '').trim().toLowerCase() !== 'false'
    : true;

const API_BASE_FOR_EXTERNAL = (import.meta as any).env?.DEV && USE_VITE_PROXY ? '' : BACKEND_BASE_URL;

const MODELS_URL =
  (import.meta as any)?.env?.VITE_MODELS_API_URL && typeof (import.meta as any).env.VITE_MODELS_API_URL === 'string'
    ? (import.meta as any).env.VITE_MODELS_API_URL.replace(/"/g, '').trim()
    : `${API_BASE_FOR_EXTERNAL}/api/models?`;

const STATIC_AUTH_SESSION_KEY = 'jb_static_auth_session';

const MODELS_BEARER_TOKEN =
  (import.meta as any)?.env?.VITE_MODELS_BEARER_TOKEN && typeof (import.meta as any).env.VITE_MODELS_BEARER_TOKEN === 'string'
    ? (import.meta as any).env.VITE_MODELS_BEARER_TOKEN.replace(/"/g, '').trim()
    :
      (import.meta as any)?.env?.VITE_AUTH_SIGNUP_BEARER_TOKEN &&
      typeof (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN === 'string'
      ? (import.meta as any).env.VITE_AUTH_SIGNUP_BEARER_TOKEN.replace(/"/g, '').trim()
      : '';

const getStoredBearerToken = (): string => {
  try {
    const raw = localStorage.getItem(STATIC_AUTH_SESSION_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as any;
    const token = typeof parsed?.token === 'string' ? parsed.token : '';
    const tokenType = typeof parsed?.token_type === 'string' ? parsed.token_type : 'Bearer';
    if (!token) return '';
    return `${tokenType} ${token}`.trim();
  } catch {
    return '';
  }
};

const MODELS_API_KEY =
  (import.meta as any)?.env?.VITE_MODELS_API_KEY && typeof (import.meta as any).env.VITE_MODELS_API_KEY === 'string'
    ? (import.meta as any).env.VITE_MODELS_API_KEY.replace(/"/g, '').trim()
    :
      (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY && typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY === 'string'
      ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY.replace(/"/g, '').trim()
      : '';

const MODELS_API_KEY_HEADER =
  (import.meta as any)?.env?.VITE_MODELS_API_KEY_HEADER &&
  typeof (import.meta as any).env.VITE_MODELS_API_KEY_HEADER === 'string'
    ? (import.meta as any).env.VITE_MODELS_API_KEY_HEADER.replace(/"/g, '').trim()
    :
      (import.meta as any)?.env?.VITE_AUTH_SIGNUP_API_KEY_HEADER &&
      typeof (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER === 'string'
      ? (import.meta as any).env.VITE_AUTH_SIGNUP_API_KEY_HEADER.replace(/"/g, '').trim()
      : 'x-api-key';

const CHAT_COMPLETIONS_URL =
  (import.meta as any)?.env?.VITE_CHAT_COMPLETIONS_URL &&
  typeof (import.meta as any).env.VITE_CHAT_COMPLETIONS_URL === 'string'
    ? (import.meta as any).env.VITE_CHAT_COMPLETIONS_URL.replace(/"/g, '').trim()
    : `${API_BASE_FOR_EXTERNAL}/api/chat/completions`;

const generateTitle = (content: string): string => {
  const words = content.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
};

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [models, setModels] = useState<AIModel[]>(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>('jupiterbrains');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      try {
        const envToken = MODELS_BEARER_TOKEN;
        const storedToken = getStoredBearerToken();

        const authValue = envToken
          ? envToken.toLowerCase().startsWith('bearer ')
            ? envToken
            : `Bearer ${envToken}`
          : storedToken;

        const bearerHeader = authValue ? { Authorization: authValue } : {};
        const apiKeyHeader = MODELS_API_KEY ? { [MODELS_API_KEY_HEADER]: MODELS_API_KEY } : {};

        const res = await fetch(MODELS_URL, {
          method: 'GET',
          headers: { Accept: 'application/json', ...bearerHeader, ...apiKeyHeader },
        });

        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        if (cancelled || !data) return;

        const d: any = data as any;

        const rawModels =
          Array.isArray(d)
            ? d
            : Array.isArray(d?.models)
              ? d.models
              : Array.isArray(d?.data)
                ? d.data
                : Array.isArray(d?.data?.models)
                  ? d.data.models
                  : Array.isArray(d?.items)
                    ? d.items
                    : Array.isArray(d?.results)
                      ? d.results
                      : Array.isArray(d?.result)
                        ? d.result
                        : Array.isArray(d?.payload)
                          ? d.payload
                          : Array.isArray(d?.payload?.models)
                            ? d.payload.models
                            : null;
        if (!Array.isArray(rawModels) || rawModels.length === 0) return;

        const mapped: AIModel[] = rawModels
          .map((m: any) => {
            if (typeof m === 'string') {
              return {
                id: m,
                name: m,
                description: 'Model',
                enabled: true,
              };
            }

            const id = String(m?.id ?? m?.model ?? m?.key ?? m?.value ?? m?.name ?? '').trim();
            if (!id) return null;
            return {
              id,
              name: String(m?.name ?? id),
              description: String(m?.description ?? m?.desc ?? 'Model'),
              enabled: typeof m?.enabled === 'boolean' ? m.enabled : true,
            };
          })
          .filter(Boolean) as AIModel[];

        if (mapped.length === 0) return;

        setModels(mapped);
        setSelectedModel((prev) => {
          const enabled = mapped.filter((x) => x.enabled);
          const available = enabled.length > 0 ? enabled : mapped;
          return available.some((x) => x.id === prev) ? prev : available[0].id;
        });
      } catch {
        // ignore
      }
    };

    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;
  const enabledModels = models.filter((m) => m.enabled);

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: selectedModel,
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [selectedModel]);

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  const sendMessage = useCallback(async (content: string) => {
    let session = currentSession;
    
    if (!session) {
      session = createNewSession();
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Update session with user message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === session!.id) {
          const updatedMessages = [...s.messages, userMessage];
          return {
            ...s,
            messages: updatedMessages,
            title: s.messages.length === 0 ? generateTitle(content) : s.title,
            updatedAt: new Date(),
          };
        }
        return s;
      })
    );

    setIsLoading(true);

    try {
      const envToken = MODELS_BEARER_TOKEN;
      const storedToken = getStoredBearerToken();

      const authValue = envToken
        ? envToken.toLowerCase().startsWith('bearer ')
          ? envToken
          : `Bearer ${envToken}`
        : storedToken;

      const bearerHeader = authValue ? { Authorization: authValue } : {};
      const apiKeyHeader = MODELS_API_KEY ? { [MODELS_API_KEY_HEADER]: MODELS_API_KEY } : {};

      const history = [...(session?.messages || []), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...bearerHeader,
          ...apiKeyHeader,
        },
        credentials: 'include',
        body: JSON.stringify({
          model: selectedModel,
          message: content,
          messages: history,
          session_id: session?.id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const detail = typeof (data as any)?.detail === 'string' ? (data as any).detail : null;
        throw new Error(detail || `Chat request failed (HTTP ${res.status})`);
      }

      const d: any = data as any;
      const aiText =
        typeof d === 'string'
          ? d
          : typeof d?.content === 'string'
            ? d.content
            : typeof d?.message === 'string'
              ? d.message
              : typeof d?.response === 'string'
                ? d.response
                : typeof d?.text === 'string'
                  ? d.text
                  : typeof d?.data?.content === 'string'
                    ? d.data.content
                    : typeof d?.data?.message === 'string'
                      ? d.data.message
                      : typeof d?.data?.response === 'string'
                        ? d.data.response
                        : typeof d?.choices?.[0]?.message?.content === 'string'
                          ? d.choices[0].message.content
                          : typeof d?.choices?.[0]?.text === 'string'
                            ? d.choices[0].text
                            : '';

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: aiText || 'No response',
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === session!.id) {
            return {
              ...s,
              messages: [...s.messages, assistantMessage],
              updatedAt: new Date(),
            };
          }
          return s;
        })
      );
    } catch (e: any) {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: e?.message || 'Failed to get response',
        timestamp: new Date(),
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === session!.id) {
            return {
              ...s,
              messages: [...s.messages, assistantMessage],
              updatedAt: new Date(),
            };
          }
          return s;
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, createNewSession, selectedModel, models]);

  const updateModel = useCallback((modelId: string, updates: Partial<AIModel>) => {
    setModels((prev) =>
      prev.map((m) => (m.id === modelId ? { ...m, ...updates } : m))
    );
  }, []);

  const addModel = useCallback((model: Omit<AIModel, 'id'>) => {
    const newModel: AIModel = {
      ...model,
      id: generateId(),
    };
    setModels((prev) => [...prev, newModel]);
  }, []);

  const removeModel = useCallback((modelId: string) => {
    setModels((prev) => prev.filter((m) => m.id !== modelId));
  }, []);

  return {
    sessions,
    currentSession,
    currentSessionId,
    models,
    enabledModels,
    selectedModel,
    isLoading,
    createNewSession,
    selectSession,
    deleteSession,
    sendMessage,
    setSelectedModel,
    updateModel,
    addModel,
    removeModel,
  };
}
