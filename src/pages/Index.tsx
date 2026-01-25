import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatArea } from '@/components/chat/ChatArea';
import { AdminPanel } from '@/components/chat/AdminPanel';
import { useChatStore } from '@/hooks/useChatStore';

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const {
    sessions,
    currentSession,
    currentSessionId,
    enabledModels,
    models,
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
  } = useChatStore();

  const selectedModelName =
    models.find((m) => m.id === selectedModel)?.name || 'JupiterBrains';

  return (
    <div className="flex h-screen bg-background dark">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isOpen={isSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <ChatHeader
          models={enabledModels}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <ChatArea
            messages={currentSession?.messages || []}
            onSend={sendMessage}
            isLoading={isLoading}
            selectedModelName={selectedModelName}
          />
        </div>
      </div>

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        models={models}
        onUpdateModel={updateModel}
        onAddModel={addModel}
        onRemoveModel={removeModel}
      />
    </div>
  );
};

export default Index;
