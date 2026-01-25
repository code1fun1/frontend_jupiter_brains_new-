import { ChevronDown, Sparkles, Bot, Brain, Shuffle, Server } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AIModel } from '@/types/chat';

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

const getModelIcon = (modelId: string) => {
  switch (modelId) {
    case 'jupiterbrains':
      return <Server className="h-4 w-4" />;
    case 'chatgpt':
      return <Sparkles className="h-4 w-4" />;
    case 'claude':
      return <Brain className="h-4 w-4" />;
    case 'gemini':
      return <Bot className="h-4 w-4" />;
    case 'random':
      return <Shuffle className="h-4 w-4" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
};

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
}: ModelSelectorProps) {
  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-foreground hover:bg-accent px-3 py-2 h-auto font-medium"
        >
          {currentModel && getModelIcon(currentModel.id)}
          <span>{currentModel?.name || 'Select Model'}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 bg-popover border border-border shadow-lg z-50"
      >
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${
              selectedModel === model.id ? 'bg-accent' : ''
            }`}
          >
            <div className="flex-shrink-0 text-muted-foreground">
              {getModelIcon(model.id)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{model.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {model.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
