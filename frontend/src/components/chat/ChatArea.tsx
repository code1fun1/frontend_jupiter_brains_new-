import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import jupiterBrainsLogo from '@/assets/jupiter-brains-logo.png';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedModelName: string;
  selectedModel: string;
  onChangeModel: (modelId: string) => void;
}

export function ChatArea({ messages, onSend, isLoading, selectedModelName, selectedModel, onChangeModel }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-md">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                  <img src={jupiterBrainsLogo} alt="JupiterBrains" className="w-10 h-10" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-semibold mb-2 text-white">
                  How can I help you today?
                </h1>
                <p className="text-gray-400">
                  Using <span className="font-medium text-white">{selectedModelName}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-4 px-4 py-6 bg-card">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <img src={jupiterBrainsLogo} alt="JupiterBrains" className="w-5 h-5 animate-pulse-subtle" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-2">JupiterBrains</div>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 pb-6">
        <ChatInput
          onSend={onSend}
          isLoading={isLoading}
          selectedModel={selectedModel}
          onChangeModel={onChangeModel}
        />
      </div>
    </div>
  );
}
