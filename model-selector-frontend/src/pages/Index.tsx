import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatArea } from '@/components/chat/ChatArea';
import { useChatStoreContext } from '@/contexts/ChatStoreContext';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showRecommendationPopup, setShowRecommendationPopup] = useState(true);

  const {
    sessions,
    currentSession,
    currentSessionId,
    enabledModels,
    models,
    ensureModelsLoaded,
    refreshModels,
    selectedModel,
    isLoading,
    createNewSession,
    selectSession,
    deleteSession,
    sendMessage,
    setSelectedModel,
  } = useChatStoreContext();

  const modelsForSelector = enabledModels.length > 0 ? enabledModels : models;

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const selectedModelName =
    models.find((m) => m.id === selectedModel)?.name || (models.length > 0 ? 'JupiterBrains' : 'No models available');

  const handleSignOut = async () => {
    setIsSigningOut(true);
    // Wait for fade-out animation
    await new Promise(resolve => setTimeout(resolve, 400));
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background dark">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background dark relative">
      {/* Sign Out Transition Overlay */}
      {isSigningOut && (
        <div className="absolute inset-0 bg-background z-50 animate-in fade-in duration-400">
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
              <p className="text-white text-sm">Signing out...</p>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAdmin={() => navigate('/admin')}
        onSignOut={handleSignOut}
        isOpen={isSidebarOpen}
        isAdmin={isAdmin}
        userName={user.name || user.email}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <ChatHeader
          models={modelsForSelector}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onOpenModels={() => {
            refreshModels();
          }}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          isSidebarOpen={isSidebarOpen}
          showRecommendationPopup={showRecommendationPopup}
          onToggleRecommendation={setShowRecommendationPopup}
        />

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <ChatArea
            messages={currentSession?.messages || []}
            onSend={sendMessage}
            isLoading={isLoading}
            selectedModelName={selectedModelName}
            selectedModel={selectedModel}
            onChangeModel={setSelectedModel}
            disabled={models.length === 0}
            showRecommendationPopup={showRecommendationPopup}
            onToggleRecommendation={setShowRecommendationPopup}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
