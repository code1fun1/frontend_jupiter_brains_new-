import { Plus, MessageSquare, Trash2, PanelLeftClose, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatSession } from '@/types/chat';
import { cn } from '@/lib/utils';
import JupiterBrainsLogo from '@/components/icons/JupiterBrainsLogo';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
  onOpenAdmin: () => void;
  isOpen: boolean;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onClose,
  onOpenAdmin,
  isOpen,
}: ChatSidebarProps) {
  const todaySessions = sessions.filter((s) => {
    const today = new Date();
    return s.updatedAt.toDateString() === today.toDateString();
  });

  const yesterdaySessions = sessions.filter((s) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return s.updatedAt.toDateString() === yesterday.toDateString();
  });

  const olderSessions = sessions.filter((s) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return s.updatedAt < yesterday;
  });

  const SessionGroup = ({
    title,
    items,
  }: {
    title: string;
    items: ChatSession[];
  }) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                currentSessionId === session.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{session.title}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300',
        isOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <JupiterBrainsLogo className="w-7 h-7 text-sidebar-foreground" />
          <span className="font-semibold text-sidebar-foreground">JupiterBrains</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 px-2 scrollbar-thin">
        <SessionGroup title="Today" items={todaySessions} />
        <SessionGroup title="Yesterday" items={yesterdaySessions} />
        <SessionGroup title="Previous" items={olderSessions} />
        
        {sessions.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No chat history yet.
            <br />
            Start a new conversation!
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={onOpenAdmin}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Settings className="h-4 w-4" />
          Admin Panel
        </Button>
      </div>
    </div>
  );
}
