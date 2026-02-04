import { useRef, useEffect, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_ENDPOINTS, buildAuthHeaders } from '@/utils/config';
import { Lightbulb } from 'lucide-react';
import jupiterBrainsLogo from '@/assets/jupiter-brains-logo.png';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedModelName: string;
  selectedModel: string;
  onChangeModel: (modelId: string) => void;
}

interface SuggestedPrompt {
  title: string;
  description: string;
}

export function ChatArea({ messages, onSend, isLoading, selectedModelName, selectedModel, onChangeModel }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPrompt[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch suggested prompts from tools API
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const toolsUrl = API_ENDPOINTS.tools.list();
        const response = await fetch(toolsUrl, {
          headers: {
            ...buildAuthHeaders(),
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          // Map API response to suggested prompts
          if (Array.isArray(data)) {
            const prompts = data.slice(0, 3).map((tool: any) => ({
              title: tool.name || tool.title || 'Suggested prompt',
              description: tool.description || tool.subtitle || '',
            }));
            setSuggestedPrompts(prompts);
          }
        }
      } catch (error) {
        // Fallback to default prompts if API fails
        setSuggestedPrompts([
          {
            title: 'Explain options trading',
            description: "I'm familiar with buying and selling stocks",
          },
          {
            title: 'Give me ideas',
            description: 'for what to do with my kids art',
          },
          {
            title: 'Overcome procrastination',
            description: 'give me tips',
          },
        ]);
      }
    };

    fetchTools();
  }, []);

  const isEmpty = messages.length === 0;

  const handlePromptClick = (prompt: SuggestedPrompt) => {
    onSend(prompt.title);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-2xl w-full">
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

              {/* Suggested Prompts */}
              {suggestedPrompts.length > 0 && (
                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Lightbulb className="h-4 w-4" />
                    <span>Suggested</span>
                  </div>
                  <div className="grid gap-3">
                    {suggestedPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt)}
                        className="group text-left p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 hover:border-white/20"
                      >
                        <div className="font-medium text-white text-sm mb-1">
                          {prompt.title}
                        </div>
                        {prompt.description && (
                          <div className="text-xs text-gray-400">
                            {prompt.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
