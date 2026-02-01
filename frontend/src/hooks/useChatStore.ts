import { useState, useCallback } from 'react';
import { Message, ChatSession, AIModel, DEFAULT_MODELS } from '@/types/chat';

const generateId = () => Math.random().toString(36).substring(2, 15);

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

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `This is a demo response from **${models.find(m => m.id === selectedModel)?.name || 'AI'}**.\n\nTo enable real AI responses, connect your AI provider and configure the integration.\n\n*Your message was:* "${content}"`,
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

      setIsLoading(false);
    }, 1000);
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
