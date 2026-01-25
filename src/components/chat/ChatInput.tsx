import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isLoading && !disabled) {
      onSend(value.trim());
      setValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
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
  );
}
