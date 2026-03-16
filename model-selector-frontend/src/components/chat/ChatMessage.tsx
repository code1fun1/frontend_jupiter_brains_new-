import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

        {/* Text content */}
        {message.content && !hasFiles && (
          <div className="prose prose-invert prose-sm max-w-none text-foreground leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings
                h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1.5 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
                // Lists
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 pl-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 pl-2">{children}</ol>,
                li: ({ children }) => <li className="text-foreground">{children}</li>,
                // Paragraph
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                // Inline code
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <code className={cn('block bg-zinc-800 border border-zinc-700 rounded-lg p-3 my-2 text-sm font-mono overflow-x-auto text-zinc-200 whitespace-pre', className)} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-sm font-mono text-violet-300" {...props}>
                      {children}
                    </code>
                  );
                },
                // Code block wrapper
                pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
                // Blockquote
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-violet-500/50 pl-3 my-2 italic text-zinc-400">{children}</blockquote>
                ),
                // Links
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline underline-offset-2 hover:text-violet-300 transition-colors">
                    {children}
                  </a>
                ),
                // Horizontal rule
                hr: () => <hr className="my-3 border-zinc-700" />,
                // Strong / bold
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                // Em / italic
                em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
              }}
            >
              {message.content}
            </ReactMarkdown>
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
