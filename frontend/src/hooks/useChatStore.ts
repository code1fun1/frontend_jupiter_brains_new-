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
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const initialModels = readCachedModels() || DEFAULT_MODELS;
    const enabled = initialModels.filter(m => m.enabled);
    return (enabled.length > 0 ? enabled[0] : initialModels[0]).id;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Save sessions whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Save current session ID whenever it changes
  useEffect(() => {
    saveCurrentSessionId(currentSessionId);
  }, [currentSessionId]);

  // Function to load/refresh chats from backend
  const loadChatsFromBackend = useCallback(async () => {
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

        // Merge with local sessions - preserve messages from localStorage
        const localSessions = loadSessions();
        const mergedSessions = backendChats.map(backendChat => {
          // Find matching local session
          const localSession = localSessions.find(local => local.id === backendChat.id);

          // If local session exists, preserve messages and potentially the title
          if (localSession) {
            return {
              ...backendChat,
              messages: localSession.messages.length > 0 ? localSession.messages : backendChat.messages,
              title: (backendChat.title === 'New Chat' && localSession.title !== 'New Chat')
                ? localSession.title
                : backendChat.title,
            };
          }

          return backendChat;
        });

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
  }, []);

  // Load chats from backend on mount
  useEffect(() => {
    loadChatsFromBackend();
  }, [loadChatsFromBackend]); // Run once on mount

  // Load current chat messages on mount (after page refresh)
  const messagesLoadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadCurrentChatMessages = async () => {
      if (!currentSessionId) {
        console.log('No currentSessionId, skipping message load');
        return;
      }

      // Skip if already loaded
      if (messagesLoadedRef.current.has(currentSessionId)) {
        console.log('Messages already loaded for:', currentSessionId);
        return;
      }

      const session = sessions.find(s => s.id === currentSessionId);
      if (!session) {
        console.log('Session not found:', currentSessionId);
        return;
      }

      // If session has no messages and is a backend ID (not a local temp ID), load from backend
      // Local IDs are short (random string), Backend IDs are usually UUIDs (36 chars)
      if (session.messages.length === 0 && currentSessionId.length > 20) {
        try {
          console.log('Loading messages for current chat:', currentSessionId);
          const response = await fetch(API_ENDPOINTS.chat.get(currentSessionId), {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Loaded current chat data:', data);

            // Update session with messages from backend
            if (data.chat && Array.isArray(data.chat.messages)) {
              const backendMessages = data.chat.messages.map((msg: any) => ({
                id: msg.id || generateId(),
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp || msg.created_at * 1000),
              }));

              console.log('Setting messages:', backendMessages.length);
              setSessions(prev => prev.map(s =>
                s.id === currentSessionId
                  ? { ...s, messages: backendMessages }
                  : s
              ));

              // Mark as loaded
              messagesLoadedRef.current.add(currentSessionId);
            }
          } else {
            console.error('Failed to load current chat messages:', response.status);
          }
        } catch (error) {
          console.error('Error loading current chat messages:', error);
        }
      } else {
        console.log('Session already has messages:', session.messages.length);
      }
    };

    // Wait for sessions to load first, then load messages
    const timer = setTimeout(() => {
      if (sessions.length > 0 && currentSessionId) {
        loadCurrentChatMessages();
      }
    }, 500); // Small delay to ensure sessions are loaded

    return () => clearTimeout(timer);
  }, [currentSessionId, sessions]); // Depend on full sessions array

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
        if (!Array.isArray(rawModels)) {
          const cached = readCachedModels();
          if (cached) setModels(cached);
          modelsFetchStartedRef.current = false;
          return;
        }

        if (rawModels.length === 0) {
          setModels([]);
          writeCachedModels([]);
          modelsFetchStartedRef.current = false;
          return;
        }

        let mapped: AIModel[] = rawModels
          .map((m: any) => {
            if (typeof m === 'string') {
              return {
                id: m,
                name: m,
                description: 'Model',
                enabled: false,
                rawData: null,
              };
            }

            const id = String(m?.id ?? m?.model ?? m?.key ?? m?.value ?? m?.name ?? '').trim();
            if (!id) return null;

            // Explicit check for access_control property existence and value
            // - Property doesn't exist (unsaved model) -> Disabled
            // - Property exists and is null (public model) -> Enabled
            // - Property exists and is object (private model) -> Disabled
            let isEnabled = false;

            if ('access_control' in m) {
              // Property exists - model is saved
              if (m.access_control === null) {
                isEnabled = true; // Public
              } else {
                isEnabled = false; // Private
              }
            } else {
              // Property doesn't exist - unsaved model
              isEnabled = false;
            }

            // Override with explicit enabled flag if present
            if (typeof m?.enabled === 'boolean') {
              isEnabled = m.enabled;
            }

            return {
              id,
              name: String(m?.name ?? id),
              description: String(m?.description ?? m?.desc ?? 'Model'),
              enabled: isEnabled,
              rawData: m,
            };
          })
          .filter(Boolean) as AIModel[];

        // Fetch enriched models to get access_control info
        try {
          const baseRes = await fetch(API_ENDPOINTS.models.base(), {
            method: 'GET',
            headers: { Accept: 'application/json', ...bearerHeader, ...apiKeyHeader },
            credentials: 'include',
          });

          if (baseRes.ok) {
            const baseModels = await baseRes.json().catch(() => null);
            if (Array.isArray(baseModels)) {
              mapped = mapped.map((model) => {
                const enriched = baseModels.find((bm: any) => bm.id === model.id);
                if (enriched && 'access_control' in enriched) {
                  const isEnabled = enriched.access_control === null;
                  return {
                    ...model,
                    enabled: isEnabled,
                    rawData: { ...model.rawData, ...enriched },
                  };
                }
                return model;
              });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch enriched models:', err);
        }

        setModels(mapped);
        writeCachedModels(mapped);
        if (mapped.length > 0) {
          setSelectedModel((prev) => {
            const enabled = mapped.filter((x) => x.enabled);
            const available = enabled.length > 0 ? enabled : mapped;
            return available.some((x) => x.id === prev) ? prev : available[0].id;
          });
        }
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

      modelsFetchStartedRef.current = false;
      modelsFetchInFlightRef.current = null;

      if (!isLoggedOut) {
        // Refresh models to get fresh enriched data after login
        refreshModels().catch(() => {
          // ignore
        });
      } else {
        // On logout, set to cached or default models
        setModels(readCachedModels() || DEFAULT_MODELS);
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

  const selectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);

    // Load messages from backend if session has no messages and is a backend ID
    const session = sessions.find(s => s.id === sessionId);
    if (session && session.messages.length === 0 && sessionId.length > 20) {
      try {
        console.log('Loading messages for chat:', sessionId);
        const response = await fetch(API_ENDPOINTS.chat.get(sessionId), {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Loaded chat data:', data);

          // Update session with messages from backend
          if (data.chat && Array.isArray(data.chat.messages)) {
            const backendMessages = data.chat.messages.map((msg: any) => ({
              id: msg.id || generateId(),
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp || msg.created_at * 1000),
            }));

            setSessions(prev => prev.map(s =>
              s.id === sessionId
                ? { ...s, messages: backendMessages }
                : s
            ));
          }
        } else {
          console.error('Failed to load messages:', response.status);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  const sendMessage = useCallback(async (
    content: string,
    modelOverride?: string,
    slmEnabled: boolean = true,
    slmDecision: 'accept' | 'reject' | null = null,
    imageGeneration: boolean = false
  ) => {
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
            title: generateTitle(content),
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
            const newTitle = generateTitle(content);
            session = { ...session, id: backendId, title: newTitle };

            // Update in sessions array
            setSessions((prev) =>
              prev.map((s) => (s.id === oldSessionId ? { ...s, id: backendId, title: newTitle } : s))
            );

            // Update current session ID
            setCurrentSessionId(backendId);

            console.log(`Session ID updated: ${oldSessionId} -> ${backendId}`);

            // Refresh chat list from backend to show new chat
            await loadChatsFromBackend();
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
          stream: false,
          features: {
            voice: false,
            image_generation: imageGeneration,
            code_interpreter: false,
            web_search: false,
          },
          metadata: {
            slm_enabled: slmEnabled,
            slm_decision: slmDecision,
            slm_processed: false,
            user_id: session?.id || 'anonymous',
            session_id: session?.id || generateId(),
          },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const detail = typeof (data as any)?.detail === 'string' ? (data as any).detail : null;
        const errorMsg = detail || `Chat request failed (HTTP ${res.status})`;

        // Handle "model not found" or 400 errors by triggering a model selection dialog
        if (res.status === 400 || (errorMsg.toLowerCase().includes('model') && errorMsg.toLowerCase().includes('not found'))) {
          console.warn('Model error detected, triggering selection dialog:', errorMsg);
          return {
            isRecommendation: true,
            recommendation: {
              type: 'model_recommendation',
              reason: detail || 'The selected model is not available. Please choose a working model from the list below.',
              recommended_model: models.find(m => m.enabled)?.id || models[0]?.id || '',
              alternatives: models.map(m => ({
                id: m.id,
                name: m.name,
                recommended_for: m.description
              }))
            }
          };
        }
        throw new Error(errorMsg);
      }

      const d: any = data as any;
      const payload = d?.data || d;

      // Debug logging
      console.log('useChatStore: Raw API Response =', d);
      console.log('useChatStore: Payload to check =', payload);
      console.log('useChatStore: Payload type field =', payload?.type);
      console.log('useChatStore: Has recommended_model =', !!payload?.recommended_model);
      console.log('useChatStore: Model override present =', !!modelOverride);
      console.log('useChatStore: SLM enabled =', slmEnabled);

      // Check if response is a model recommendation
      // We check for several indicators of a recommendation
      const isRecommendation = (
        payload?.type === 'model_recommendation' ||
        payload?.recommended_model ||
        payload?.recommendation ||
        payload?.is_recommendation ||
        payload?.intent // Sometimes used in recommendations
      ) && !modelOverride;

      if (isRecommendation) {
        console.log('useChatStore: Model recommendation detected! Returning to ChatArea.');
        // Return recommendation to caller (ChatArea will handle popup)
        return {
          isRecommendation: true,
          recommendation: payload,
        };
      }

      console.log('useChatStore: Not a recommendation, processing as AI response');

      // Extract AI response - check root and .data
      const aiText =
        typeof payload === 'string'
          ? payload
          : typeof payload?.content === 'string'
            ? payload.content
            : typeof payload?.message === 'string'
              ? payload.message
              : typeof payload?.response === 'string'
                ? payload.response
                : typeof payload?.text === 'string'
                  ? payload.text
                  : typeof payload?.choices?.[0]?.message?.content === 'string'
                    ? payload.choices[0].message.content
                    : typeof payload?.choices?.[0]?.text === 'string'
                      ? payload.choices[0].text
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

      // Call /api/chat/completed to save the conversation
      try {
        const updatedMessages = [...session!.messages, assistantMessage];

        // Convert messages to backend format
        const formattedMessages = updatedMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: Math.floor(msg.timestamp.getTime() / 1000), // Convert to Unix timestamp
        }));

        const completedPayload = {
          model: modelToUse,
          messages: formattedMessages,
          chat_id: session!.id,
          session_id: session!.id, // Using chat ID as session ID
          id: assistantMessage.id,
        };

        console.log('Calling /api/chat/completed with payload:', completedPayload);

        const completedResponse = await fetch(API_ENDPOINTS.chat.completed(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(completedPayload),
        });

        if (completedResponse.ok) {
          const completedData = await completedResponse.json();
          console.log('Chat saved successfully:', completedData);

          // Now call POST /api/v1/chats/{id} to update chat with history structure
          try {
            // Build messages object with parent-child relationships
            const messagesObject: any = {};
            const messagesArray: any[] = [];

            updatedMessages.forEach((msg, index) => {
              const isUser = msg.role === 'user';
              const isAssistant = msg.role === 'assistant';

              // Determine parent and children
              const parentId = index > 0 ? updatedMessages[index - 1].id : null;
              const childrenIds = index < updatedMessages.length - 1 ? [updatedMessages[index + 1].id] : [];

              const messageObj: any = {
                id: msg.id,
                parentId: parentId,
                childrenIds: childrenIds,
                role: msg.role,
                content: msg.content,
                timestamp: Math.floor(msg.timestamp.getTime() / 1000),
              };

              if (isUser) {
                messageObj.models = [modelToUse];
              }

              if (isAssistant) {
                messageObj.model = modelToUse;
                messageObj.modelName = modelToUse;
                messageObj.modelIdx = 0;
                messageObj.done = true;
              }

              messagesObject[msg.id] = messageObj;
              messagesArray.push(messageObj);
            });

            const chatUpdatePayload = {
              chat: {
                title: session!.title,
                models: [modelToUse],
                history: {
                  messages: messagesObject,
                  currentId: assistantMessage.id,
                },
                messages: messagesArray,
                params: {},
                files: [],
              },
            };

            console.log('Calling POST /api/v1/chats/' + session!.id);

            const chatUpdateResponse = await fetch(API_ENDPOINTS.chat.rename(session!.id), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(chatUpdatePayload),
            });

            if (chatUpdateResponse.ok) {
              const chatUpdateData = await chatUpdateResponse.json();
              console.log('Chat updated with history successfully:', chatUpdateData);
            } else {
              console.error('Failed to update chat with history:', chatUpdateResponse.status);
            }
          } catch (historyError) {
            console.error('Error updating chat with history:', historyError);
          }
        } else {
          console.error('Failed to save completed chat:', completedResponse.status);
        }
      } catch (error) {
        console.error('Error calling /api/chat/completed:', error);
        // Don't fail the whole flow if this fails
      }

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
