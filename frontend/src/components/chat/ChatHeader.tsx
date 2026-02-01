import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModelSelector } from './ModelSelector';
import { AIModel } from '@/types/chat';

interface ChatHeaderProps {
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onOpenSidebar: () => void;
  isSidebarOpen: boolean;
}

export function ChatHeader({
  models,
  selectedModel,
  onSelectModel,
  onOpenSidebar,
  isSidebarOpen,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
      {!isSidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          className="h-9 w-9"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      )}
      <ModelSelector
        models={models}
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
      />
    </header>
  );
}
