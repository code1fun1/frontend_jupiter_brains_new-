import { User } from 'lucide-react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import jupiterBrainsLogo from '@/assets/jupiter-brains-logo.png';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasFiles = message.files && message.files.length > 0;

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
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center ring-1 ring-zinc-600">
            <User className="h-5 w-5 text-zinc-200" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center ring-1 ring-violet-500/40">
            <img src={jupiterBrainsLogo} alt="JupiterBrains" className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {isUser ? (
          <div className="font-semibold text-sm text-zinc-400 tracking-wide">You</div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
            <span className="font-semibold text-sm bg-gradient-to-r from-violet-300 to-purple-400 bg-clip-text text-transparent tracking-wide">
              JupiterBrains
            </span>
          </div>
        )}

        {/* Text content — hidden when images are present */}
        {message.content && !hasFiles && (
          <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed">
            {parseMarkdown(message.content)}
          </div>
        )}

        {/* Generated files: images and videos */}
        {hasFiles && (
          <div className="mt-3 flex flex-wrap gap-3">
            {message.files!.map((file, i) => {
              const isVideo = file.type === 'video';
              return isVideo ? (
                // --- Video ---
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl border border-violet-500/30 shadow-lg max-w-sm w-full"
                >
                  <video
                    src={file.url}
                    controls
                    className="w-full rounded-xl"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="px-3 py-1.5 bg-violet-500/10 border-t border-violet-500/20 flex items-center gap-1.5">
                    <span className="text-xs text-violet-400 font-medium">
                      {file.name || 'Generated video'}
                    </span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-violet-400/70 hover:text-violet-400 transition-colors"
                    >
                      Open ↗
                    </a>
                  </div>
                </div>
              ) : (
                // --- Image (unchanged) ---
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                  title="Click to download"
                >
                  <div className="relative overflow-hidden rounded-xl border border-border shadow-lg group-hover:shadow-xl transition-shadow duration-200">
                    <img
                      src={file.url}
                      alt={file.name || `Generated image ${i + 1}`}
                      loading="lazy"
                      className="max-w-sm w-full object-cover rounded-xl group-hover:opacity-90 transition-opacity duration-200"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-xs truncate">
                        {file.name || 'Generated image'} · Click to download ↓
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Fallback label if no text and no files at all */}
        {!message.content && !hasFiles && (
          <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed">
            <span>No response</span>
          </div>
        )}
      </div>
    </div>
  );
}
