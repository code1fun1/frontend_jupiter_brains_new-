import { createContext, ReactNode, useContext } from 'react';
import { useChatStore } from '@/hooks/useChatStore';

type ChatStore = ReturnType<typeof useChatStore>;

const ChatStoreContext = createContext<ChatStore | null>(null);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const store = useChatStore();

  return (
    <ChatStoreContext.Provider value={store}>{children}</ChatStoreContext.Provider>
  );
}

export function useChatStoreContext() {
  const store = useContext(ChatStoreContext);
  if (!store) {
    throw new Error('useChatStoreContext must be used within ChatStoreProvider');
  }
  return store;
}
