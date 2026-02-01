import { User, Bot } from 'lucide-react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import JupiterBrainsLogo from '@/components/icons/JupiterBrainsLogo';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Simple markdown parsing for basic formatting
  const parseMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Bold
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Code
        line = line.replace(/`(.*?)`/g, '<code class="bg-accent px-1 py-0.5 rounded text-sm">$1</code>');
        
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: line }}
            className="block"
          />
        );
      });
  };

  return (
    <div
      className={cn(
        'flex gap-4 px-4 py-6 animate-fade-in',
        isUser ? 'bg-transparent' : 'bg-card'
      )}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <JupiterBrainsLogo className="w-5 h-5 text-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="font-semibold text-sm">
          {isUser ? 'You' : 'JupiterBrains'}
        </div>
        <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed">
          {parseMarkdown(message.content)}
        </div>
      </div>
    </div>
  );
}
