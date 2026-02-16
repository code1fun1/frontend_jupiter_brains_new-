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

        {/* Render images if present */}
        {message.files && message.files.filter(f => f.type === 'image' || f.content_type?.startsWith('image/')).length > 0 && (
          <div className="my-2 w-full flex overflow-x-auto gap-2 flex-wrap">
            {message.files
              .filter(f => f.type === 'image' || f.content_type?.startsWith('image/'))
              .map((file, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={file.url}
                    alt={message.content || 'Generated image'}
                    className="max-w-sm max-h-96 rounded-lg object-contain border border-border hover:border-primary transition-colors cursor-pointer"
                    onClick={() => window.open(file.url, '_blank')}
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.alt = 'Failed to load image';
                      target.className = 'max-w-sm h-48 rounded-lg border border-destructive flex items-center justify-center bg-muted';
                    }}
                  />
                  {/* Download button on hover */}
                  <a
                    href={file.url}
                    download={file.name || 'image.png'}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                    title="Download image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              ))}
          </div>
        )}

        <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed">
          {parseMarkdown(message.content)}
        </div>
      </div>
    </div>
  );
}
