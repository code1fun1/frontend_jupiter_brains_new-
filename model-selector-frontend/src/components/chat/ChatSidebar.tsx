import React from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, Settings, X, LogOut, User, MoreVertical, Pin, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChatSession } from '@/types/chat';
import { cn } from '@/lib/utils';
import jupiterBrainsLogo from '@/assets/jupiter-brains-logo.png';
import { API_ENDPOINTS } from '@/utils/config';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
  onOpenAdmin: () => void;
  onSignOut?: () => void;
  isOpen: boolean;
  isAdmin?: boolean;
  userName?: string;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onClose,
  onOpenAdmin,
  onSignOut,
  isOpen,
  isAdmin = false,
  userName,
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

  // State for delete confirmation dialog
  const [chatToDelete, setChatToDelete] = React.useState<{ id: string, title: string } | null>(null);

  // Cache to prevent repeated API calls on hover
  const fetchedChatsRef = React.useRef<Set<string>>(new Set());

  const handleChatHover = async (chatId: string) => {
    // Skip if already fetched
    if (fetchedChatsRef.current.has(chatId)) {
      return;
    }

    try {
      console.log('Fetching chat details for:', chatId);
      const response = await fetch(API_ENDPOINTS.chat.get(chatId), {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Chat details from backend:', data);
        // Mark as fetched
        fetchedChatsRef.current.add(chatId);
        // You can use this data to update the chat or show preview
      } else {
        console.error('Failed to fetch chat:', response.status);
      }
    } catch (error) {
      console.error('Error fetching chat on hover:', error);
    }
  };

  const handlePinChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    try {
      console.log('Pinning chat:', chatId);
      const response = await fetch(API_ENDPOINTS.chat.pin(chatId), {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Pin response:', data);
        // You can update the chat's pinned status in state here
      } else {
        console.error('Failed to pin chat:', response.status);
      }
    } catch (error) {
      console.error('Error pinning chat:', error);
    }
  };

  const handleRenameChat = async (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = prompt('Enter new chat name:', currentTitle);
    if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
      try {
        console.log('Renaming chat', chatId, 'to', newTitle);
        const response = await fetch(API_ENDPOINTS.chat.rename(chatId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chat: {
              title: newTitle.trim(),
            },
          }),
        });

        if (response.ok) {
          console.log('Chat renamed successfully');
          // Force re-fetch chats to update UI without reload
          window.location.href = window.location.href;
        } else {
          console.error('Failed to rename chat:', response.status);
          const errorData = await response.json();
          console.error('Error details:', errorData);
          alert('Failed to rename chat. Please try again.');
        }
      } catch (error) {
        console.error('Error renaming chat:', error);
        alert('Error renaming chat. Please try again.');
      }
    }
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      console.log('Deleting chat:', chatToDelete.id);
      const response = await fetch(API_ENDPOINTS.chat.delete(chatToDelete.id), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('Chat deleted successfully');
        // Call the parent's delete handler to update UI
        onDeleteSession(chatToDelete.id);
      } else {
        console.error('Failed to delete chat:', response.status);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setChatToDelete(null);
    }
  };

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
        <h3 className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                currentSessionId === session.id
                  ? 'bg-accent text-white'
                  : 'text-white hover:bg-accent/50'
              )}
              onClick={() => onSelectSession(session.id)}
              onMouseEnter={() => handleChatHover(session.id)}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0 text-white/70" />
              <span className="flex-1 truncate text-sm">{session.title}</span>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Three dots dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
                      onClick={(e) => e.stopPropagation()}
                      title="More options"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={(e) => handleRenameChat(session.id, session.title, e)}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete({ id: session.id, title: session.title });
                      }}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col h-full bg-zinc-950 border-r border-sidebar-border transition-all duration-300 z-50',
          // Mobile: fixed overlay
          'fixed md:relative',
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img src={jupiterBrainsLogo} alt="JupiterBrains" className="w-7 h-7" />
            <span className="font-semibold text-white">JupiterBrains</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:bg-sidebar-accent hover:text-white"
          >
            <X className="h-4 w-4 md:hidden" />
            <PanelLeftClose className="h-4 w-4 hidden md:block" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={onNewChat}
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent border-sidebar-border text-white hover:bg-sidebar-accent hover:text-white"
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
            <div className="px-3 py-8 text-center text-sm text-gray-400">
              No chat history yet.
              <br />
              Start a new conversation!
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {/* User info */}
          {userName && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{userName}</span>
              {isAdmin && (
                <span className="ml-auto text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-medium">
                  Admin
                </span>
              )}
            </div>
          )}

          {/* Admin Panel - Only for admins */}
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={onOpenAdmin}
              className="w-full justify-start gap-2 text-white hover:bg-sidebar-accent hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Admin Panel
            </Button>
          )}

          {/* Sign Out */}
          {onSignOut && (
            <Button
              variant="ghost"
              onClick={onSignOut}
              className="w-full justify-start gap-2 text-white hover:bg-sidebar-accent hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {chatToDelete?.title || 'this chat'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
