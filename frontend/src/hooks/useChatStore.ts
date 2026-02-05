import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, ChatSession, AIModel, DEFAULT_MODELS } from '@/types/chat';
import { getBackendBaseUrl, API_ENDPOINTS } from '@/utils/config';

const generateId = () => Math.random().toString(36).substring(2, 15);

const STATIC_AUTH_SESSION_KEY = 'jb_static_auth_session';

const MODELS_CACHE_KEY = 'jb_models_cache';

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

const readCachedModels = (): AIModel[] | null => {
  try {
    const raw = localStorage.getItem(MODELS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned = parsed
      .map((m: any) => {
        const id = typeof m?.id === 'string' ? m.id.trim() : '';
        if (!id) return null;
        return {
          id,
          name: typeof m?.name === 'string' && m.name.trim() ? m.name : id,
          description:
            typeof m?.description === 'string' && m.description.trim() ? m.description : 'Model',
          enabled: typeof m?.enabled === 'boolean' ? m.enabled : true,
        } as AIModel;
      })
      .filter(Boolean) as AIModel[];
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
};

const writeCachedModels = (models: AIModel[]) => {
  try {
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(models));
  } catch {
    // ignore
  }
};

const generateTitle = (content: string): string => {
  const words = content.split(' ').slice(0, 5).join(' ');
  return words.length > 30 ? words.substring(0, 30) + '...' : words;
};

const SESSIONS_STORAGE_KEY = 'jb_chat_sessions';
const CURRENT_SESSION_KEY = 'jb_current_session_id';

const loadSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: s.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
};

const saveSessions = (sessions: ChatSession[]) => {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
};

const loadCurrentSessionId = (): string | null => {
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  } catch {
    return null;
  }
};

const saveCurrentSessionId = (id: string | null) => {
  try {
    if (id) {
      localStorage.setItem(CURRENT_SESSION_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to save current session ID:', e);
  }
};

export function useChatStore() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => loadCurrentSessionId());
  const [models, setModels] = useState<AIModel[]>(() => readCachedModels() || DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Save sessions whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Save current session ID whenever it changes
  useEffect(() => {
    saveCurrentSessionId(currentSessionId);
  }, [currentSessionId]);

  // Load chats from backend on mount
  useEffect(() => {
    const loadChatsFromBackend = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.chat.list(1), {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Loaded chats from backend:', data);

          // Convert backend format to frontend ChatSession format
          const backendChats: ChatSession[] = (Array.isArray(data) ? data : []).map((chat: any) => ({
            id: chat.id,
            title: chat.title || 'New Chat',
            messages: [], // Messages will be loaded when chat is selected
            createdAt: new Date(chat.created_at * 1000), // Convert Unix timestamp to Date
            updatedAt: new Date(chat.updated_at * 1000),
            model: 'jupiterbrains', // Default model
          }));

          // Merge with local sessions (backend takes priority)
          const localSessions = loadSessions();
          const mergedSessions = [...backendChats];

          // Add local sessions that don't exist in backend
          localSessions.forEach(local => {
            if (!backendChats.find(b => b.id === local.id)) {
              mergedSessions.push(local);
            }
          });

          setSessions(mergedSessions);
          console.log('Total chats loaded:', mergedSessions.length);
        } else {
          console.error('Failed to load chats from backend:', response.status);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        // Continue with local sessions
      }
    };

    loadChatsFromBackend();
  }, []); // Run once on mount

  const lastAuthFingerprintRef = useRef<string>('');

  const modelsFetchStartedRef = useRef(false);
  const modelsFetchInFlightRef = useRef<Promise<void> | null>(null);

  const ensureModelsLoaded = useCallback(async () => {
    if (modelsFetchStartedRef.current) {
      if (modelsFetchInFlightRef.current) {
        await modelsFetchInFlightRef.current;
      }
      return;
    }

    modelsFetchStartedRef.current = true;

    const promise = (async () => {
      try {
        const modelsUrl = API_ENDPOINTS.models.list();

        const envToken = MODELS_BEARER_TOKEN;
        const storedToken = getStoredBearerToken();

        const authValue = envToken
          ? envToken.toLowerCase().startsWith('bearer ')
            ? envToken
            : `Bearer ${envToken}`
          : storedToken;

        const bearerHeader = authValue ? { Authorization: authValue } : {};
        const apiKeyHeader = MODELS_API_KEY ? { [MODELS_API_KEY_HEADER]: MODELS_API_KEY } : {};

        const res = await fetch(modelsUrl, {
          method: 'GET',
          headers: { Accept: 'application/json', ...bearerHeader, ...apiKeyHeader },
        });

        if (!res.ok) {
          const cached = readCachedModels();
          if (cached) setModels(cached);
          modelsFetchStartedRef.current = false;
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data) {
          const cached = readCachedModels();
          if (cached) setModels(cached);
          modelsFetchStartedRef.current = false;
          return;
        }

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
        if (!Array.isArray(rawModels) || rawModels.length === 0) {
          const cached = readCachedModels();
          if (cached) setModels(cached);
          modelsFetchStartedRef.current = false;
          return;
        }

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

        if (mapped.length === 0) {
          const cached = readCachedModels();
          if (cached) setModels(cached);
          modelsFetchStartedRef.current = false;
          return;
        }

        setModels(mapped);
        writeCachedModels(mapped);
        setSelectedModel((prev) => {
          const enabled = mapped.filter((x) => x.enabled);
          const available = enabled.length > 0 ? enabled : mapped;
          return available.some((x) => x.id === prev) ? prev : available[0].id;
        });
      } catch {
        const cached = readCachedModels();
        if (cached) setModels(cached);
        modelsFetchStartedRef.current = false;
      }
    })();

    modelsFetchInFlightRef.current = promise;
    await promise;

    modelsFetchInFlightRef.current = null;
  }, []);

  useEffect(() => {
    ensureModelsLoaded().catch(() => {
      // ignore
    });
  }, [ensureModelsLoaded]);

  const refreshModels = useCallback(async () => {
    modelsFetchStartedRef.current = false;
    modelsFetchInFlightRef.current = null;
    await ensureModelsLoaded();
  }, [ensureModelsLoaded]);

  useEffect(() => {
    const computeFingerprint = () => {
      try {
        const rawUser = localStorage.getItem('jb_static_auth');
        const rawSession = localStorage.getItem(STATIC_AUTH_SESSION_KEY);
        const user = rawUser ? JSON.parse(rawUser) : null;
        const session = rawSession ? JSON.parse(rawSession) : null;
        const email = typeof user?.email === 'string' ? user.email : '';
        const token = typeof session?.token === 'string' ? session.token : '';
        return `${email}::${token}`;
      } catch {
        return '';
      }
    };

    const handleAuthChanged = () => {
      const fp = computeFingerprint();
      if (fp === lastAuthFingerprintRef.current) return;
      lastAuthFingerprintRef.current = fp;
      const [emailPart, tokenPart] = fp.split('::');
      const isLoggedOut = !String(emailPart || '').trim() && !String(tokenPart || '').trim();
      setSessions([]);
      setCurrentSessionId(null);
      setModels(readCachedModels() || DEFAULT_MODELS);

      modelsFetchStartedRef.current = false;
      modelsFetchInFlightRef.current = null;

      if (!isLoggedOut) {
        refreshModels().catch(() => {
          // ignore
        });
      }
    };

    handleAuthChanged();

    window.addEventListener('jb-auth-changed', handleAuthChanged);
    window.addEventListener('storage', handleAuthChanged);

    return () => {
      window.removeEventListener('jb-auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleAuthChanged);
    };
  }, [refreshModels]);

  useEffect(() => {
    return () => {
      modelsFetchInFlightRef.current = null;
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

  const sendMessage = useCallback(async (content: string, modelOverride?: string) => {
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

    // If this is the first message in the session, call create chat API
    const isFirstMessage = session.messages.length === 0;

    if (isFirstMessage) {
      try {
        const createPayload = {
          chat: {
            id: "",
            title: "New Chat",
            models: [modelOverride || selectedModel],
            params: {},
            messages: [{
              id: userMessage.id,
              parentId: null,
              childrenIds: [],
              role: "user",
              content: userMessage.content,
              models: [modelOverride || selectedModel],
              timestamp: Math.floor(userMessage.timestamp.getTime() / 1000),
            }],
            tags: [],
            timestamp: Date.now(),
          },
          folder_id: null,
        };

        const createResponse = await fetch(API_ENDPOINTS.chat.create(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(createPayload),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('Chat created on backend:', createData);

          // Update session ID with backend ID
          if (createData.id) {
            const backendId = createData.id;
            const oldSessionId = session.id;

            // Update session object
            session = { ...session, id: backendId };

            // Update in sessions array
            setSessions((prev) =>
              prev.map((s) => (s.id === oldSessionId ? { ...s, id: backendId } : s))
            );

            // Update current session ID
            setCurrentSessionId(backendId);

            console.log(`Session ID updated: ${oldSessionId} -> ${backendId}`);
          }
        } else {
          console.error('Failed to create chat on backend');
        }
      } catch (error) {
        console.error('Error creating chat:', error);
        // Continue with local session
      }
    }

    // Update session with user message (only if this is the first call, not a retry)
    // If modelOverride is provided, it means user made a choice from popup and message is already added
    if (!modelOverride) {
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
    }

    setIsLoading(true);

    try {
      const chatUrl = API_ENDPOINTS.chat.completions();

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

      // Use modelOverride if provided, otherwise use selectedModel
      const modelToUse = modelOverride || selectedModel;

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...bearerHeader,
          ...apiKeyHeader,
        },
        credentials: 'include',
        body: JSON.stringify({
          model: modelToUse,
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

      // Check if response is a model recommendation
      // BUT: If modelOverride is provided, user already made a choice, so ignore recommendation
      if (d?.type === 'model_recommendation' && !modelOverride) {
        // Don't remove user message - keep it and just show popup
        // Return recommendation to caller (ChatArea will handle popup)
        return {
          isRecommendation: true,
          recommendation: d,
        };
      }

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

      return {
        isRecommendation: false,
      };
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
    setModels((prev) => {
      const next = prev.map((m) => (m.id === modelId ? { ...m, ...updates } : m));
      writeCachedModels(next);
      return next;
    });
  }, []);

  const addModel = useCallback((model: Omit<AIModel, 'id'>) => {
    const newModel: AIModel = {
      ...model,
      id: generateId(),
    };
    setModels((prev) => {
      const next = [...prev, newModel];
      writeCachedModels(next);
      return next;
    });
  }, []);

  const removeModel = useCallback((modelId: string) => {
    setModels((prev) => {
      const next = prev.filter((m) => m.id !== modelId);
      writeCachedModels(next);
      return next;
    });
  }, []);

  return {
    sessions,
    currentSession,
    currentSessionId,
    enabledModels,
    models,
    selectedModel,
    isLoading,
    createNewSession,
    selectSession,
    deleteSession,
    sendMessage,
    setSelectedModel,
    ensureModelsLoaded,
    refreshModels,
    updateModel,
    addModel,
    removeModel,
  };
}
