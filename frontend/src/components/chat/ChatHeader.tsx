import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModelSelector } from './ModelSelector';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AIModel } from '@/types/chat';

interface ChatHeaderProps {
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenModels?: () => void;
  onOpenSidebar: () => void;
  isSidebarOpen: boolean;
  showRecommendationPopup: boolean;
  onToggleRecommendation: (value: boolean) => void;
}

export function ChatHeader({
  models,
  selectedModel,
  onSelectModel,
  onOpenModels,
  onOpenSidebar,
  isSidebarOpen,
  showRecommendationPopup,
  onToggleRecommendation,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
      {!isSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}
      <ModelSelector
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
        onOpenChange={(open) => {
          if (open) onOpenModels?.();
        }}
      />

      {/* AI Recommendation Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="ml-auto flex items-center gap-2 cursor-help">
              <Switch
                checked={showRecommendationPopup}
                onCheckedChange={onToggleRecommendation}
                className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-zinc-900 border-zinc-700">
            <p className="text-sm max-w-xs">Get smart AI model suggestions tailored to your question. When enabled, the system recommends the best model for your query.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}
