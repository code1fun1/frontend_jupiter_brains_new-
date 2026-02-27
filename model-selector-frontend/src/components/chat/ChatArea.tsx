import { useRef, useEffect, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message } from '@/types/chat';
import { ScrollArea } from '@/components/ui/scroll-area';
import jupiterBrainsLogo from '@/assets/jupiter-brains-logo.png';
import { ModelSuggestionDialog } from './ModelSuggestionDialog';

interface ChatAreaProps {
  messages: Message[];
  onSend: (message: string, modelOverride?: string, slmEnabled?: boolean, slmDecision?: 'accept' | 'reject' | null, imageGeneration?: boolean, videoGeneration?: boolean) => Promise<any>;
  isLoading: boolean;
  selectedModelName: string;
  selectedModel: string;
  onChangeModel: (modelId: string) => void;
  disabled?: boolean;
  showRecommendationPopup: boolean;
  onToggleRecommendation: (value: boolean) => void;
}

export function ChatArea({ messages, onSend, isLoading, selectedModelName, selectedModel, onChangeModel, disabled, showRecommendationPopup, onToggleRecommendation }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<any>(null);

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
          <div className="max-w-5xl mx-auto">
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

      {/* Input Area - Full width at bottom */}
      <div className="flex-shrink-0 border-t border-border py-3">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          disabled={disabled}
        />
      </div>

      {/* Model Recommendation Dialog */}
      <ModelSuggestionDialog
        isOpen={recommendation !== null}
        onClose={() => {
          setRecommendation(null);
          setPendingMessage(null);
        }}
        onConfirm={async (modelId: string) => {
          if (recommendation && pendingMessage) {
            // Close dialog immediately
            setRecommendation(null);
            setPendingMessage(null);

            // Switch to selected model
            onChangeModel(modelId);
            // Resend with recommended model - slm_decision is "accept"
            await onSend(pendingMessage, modelId, showRecommendationPopup, 'accept');
          }
        }}
        onCancel={async () => {
          if (pendingMessage) {
            // Continue with current model - slm_decision is "reject"
            await onSend(pendingMessage, selectedModel, showRecommendationPopup, 'reject');
          }
          setRecommendation(null);
          setPendingMessage(null);
        }}
        suggestedModel={recommendation?.recommended_model || ''}
        reason={recommendation?.reason || ''}
        alternatives={recommendation?.alternatives || []}
      />
    </div>
  );

  async function handleSend(message: string, imageGeneration?: boolean, videoGeneration?: boolean) {
    setPendingMessage(message);
    console.log('ChatArea: Sending message, imageGeneration =', imageGeneration, 'videoGeneration =', videoGeneration);
    // Initial send - slm_decision is null
    const result = await onSend(message, undefined, showRecommendationPopup, null, imageGeneration, videoGeneration);
    console.log('ChatArea: Result from onSend =', result);

    // Check if result contains model recommendation
    if (result?.isRecommendation) {
      const recommendedModel = result.recommendation?.recommended_model;
      console.log('ChatArea: Recommendation received, showPopup =', showRecommendationPopup);

      if (showRecommendationPopup) {
        console.log('ChatArea: Setting recommendation state');
        setRecommendation(result.recommendation);
      } else {
        console.log('ChatArea: Auto-switching to model =', recommendedModel);
        if (recommendedModel) {
          onChangeModel(recommendedModel);
          await onSend(message, recommendedModel, showRecommendationPopup, 'accept', imageGeneration, videoGeneration);
        }
        setPendingMessage(null);
      }
    } else {
      console.log('ChatArea: No recommendation received or direct response given');
      setPendingMessage(null);
    }
  }
}
