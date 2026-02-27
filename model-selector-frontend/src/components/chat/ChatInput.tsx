import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Plus, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IntegrationPopup } from './IntegrationPopup';

interface ChatInputProps {
  onSend: (message: string, imageGeneration?: boolean, videoGeneration?: boolean) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
  const [videoGenerationEnabled, setVideoGenerationEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isLoading && !disabled) {
      const message = value.trim();
      onSend(message, imageGenerationEnabled, videoGenerationEnabled);
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
    <div className="w-full">
      {/* Active mode badges */}
      {(imageGenerationEnabled || videoGenerationEnabled) && (
        <div className="flex items-center gap-2 px-4 pb-2">
          {imageGenerationEnabled && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary">
              <ImageIcon className="h-3 w-3" />
              <span>Image Generation</span>
            </div>
          )}
          {videoGenerationEnabled && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs font-medium text-violet-400">
              <VideoIcon className="h-3 w-3" />
              <span>Video Generation</span>
            </div>
          )}
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-end gap-2 px-4">
        {/* Left Icons */}
        <div className="flex items-center gap-1 pb-2">
          <div className="relative">
            <Button
              onClick={() => setIsPopupOpen(!isPopupOpen)}
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Plus className="h-5 w-5" />
            </Button>

            {/* Integration Popup */}
            <IntegrationPopup
              isOpen={isPopupOpen}
              onClose={() => setIsPopupOpen(false)}
              imageGenerationEnabled={imageGenerationEnabled}
              onImageGenerationToggle={setImageGenerationEnabled}
              videoGenerationEnabled={videoGenerationEnabled}
              onVideoGenerationToggle={setVideoGenerationEnabled}
            />
          </div>
        </div>

        {/* Text Input */}
        <div className="flex-1 bg-muted rounded-2xl border border-border">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a Message"
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground',
              'focus:outline-none disabled:opacity-50 max-h-[120px] scrollbar-thin'
            )}
          />
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-2 px-4">
        JupiterBrains can make mistakes. Consider checking important information.
      </p>
    </div>
  );
}
