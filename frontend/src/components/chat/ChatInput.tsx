import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModelSuggestionDialog } from './ModelSuggestionDialog';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  selectedModel: string;
  onChangeModel: (modelId: string) => void;
}

type SuggestionType = 'onprem' | 'chatgpt' | null;

export function ChatInput({ onSend, isLoading, disabled, selectedModel, onChangeModel }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [suggestionType, setSuggestionType] = useState<SuggestionType>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const checkForKeywords = (message: string): SuggestionType => {
    const lowerMessage = message.toLowerCase();
    
    // Check for confidential/generate video keywords - suggest on-prem
    if ((lowerMessage.includes('confidential') || lowerMessage.includes('generate video')) && 
        selectedModel !== 'jupiterbrains') {
      return 'onprem';
    }
    
    // Check for strategy keyword - suggest ChatGPT
    if (lowerMessage.includes('strategy') && selectedModel !== 'chatgpt') {
      return 'chatgpt';
    }
    
    return null;
  };

  const handleSubmit = () => {
    if (value.trim() && !isLoading && !disabled) {
      const message = value.trim();
      const suggestion = checkForKeywords(message);
      
      if (suggestion) {
        setPendingMessage(message);
        setSuggestionType(suggestion);
      } else {
        onSend(message);
        setValue('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const handleConfirmSwitch = () => {
    if (suggestionType === 'onprem') {
      onChangeModel('jupiterbrains');
    } else if (suggestionType === 'chatgpt') {
      onChangeModel('chatgpt');
    }
    
    if (pendingMessage) {
      onSend(pendingMessage);
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    
    setPendingMessage(null);
    setSuggestionType(null);
  };

  const handleCancelSwitch = () => {
    if (pendingMessage) {
      onSend(pendingMessage);
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    
    setPendingMessage(null);
    setSuggestionType(null);
  };

  const handleCloseDialog = () => {
    setPendingMessage(null);
    setSuggestionType(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getSuggestionDetails = () => {
    if (suggestionType === 'onprem') {
      return {
        suggestedModel: 'JupiterBrains (On Prem)',
        reason: 'Your message contains sensitive content. For confidential data or video generation, we recommend using the JupiterBrains On-Premise model to ensure your data stays secure.',
      };
    }
    if (suggestionType === 'chatgpt') {
      return {
        suggestedModel: 'ChatGPT',
        reason: 'Your message mentions strategy. ChatGPT is particularly well-suited for creating comprehensive strategies and strategic planning.',
      };
    }
    return { suggestedModel: '', reason: '' };
  };

  const { suggestedModel, reason } = getSuggestionDetails();

  return (
    <>
      <div className="relative w-full max-w-3xl mx-auto">
        <div className="relative flex items-end bg-card border border-border rounded-2xl shadow-lg">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message JupiterBrains..."
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              'flex-1 resize-none bg-transparent px-4 py-3.5 pr-14 text-foreground placeholder:text-muted-foreground',
              'focus:outline-none disabled:opacity-50 max-h-[200px] scrollbar-thin'
            )}
          />
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading || disabled}
            size="icon"
            className={cn(
              'absolute right-2 bottom-2 h-8 w-8 rounded-lg transition-all',
              value.trim() && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          JupiterBrains can make mistakes. Consider checking important information.
        </p>
      </div>

      <ModelSuggestionDialog
        isOpen={suggestionType !== null}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
        suggestedModel={suggestedModel}
        reason={reason}
      />
    </>
  );
}
