import { useState } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AIModel } from '@/types/chat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  models: AIModel[];
  onUpdateModel: (modelId: string, updates: Partial<AIModel>) => void;
  onAddModel: (model: Omit<AIModel, 'id'>) => void;
  onRemoveModel: (modelId: string) => void;
}

export function AdminPanel({
  isOpen,
  onClose,
  models,
  onUpdateModel,
  onAddModel,
  onRemoveModel,
}: AdminPanelProps) {
  const [newModelName, setNewModelName] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');

  const handleAddModel = () => {
    if (newModelName.trim()) {
      onAddModel({
        name: newModelName.trim(),
        description: newModelDescription.trim() || 'Custom model',
        enabled: true,
      });
      setNewModelName('');
      setNewModelDescription('');
    }
  };

  const defaultModelIds = ['jupiterbrains', 'chatgpt', 'claude', 'gemini', 'random'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Admin Panel</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Model Configuration */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
              Model Configuration
            </h3>
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{model.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {model.description}
                    </div>
                  </div>
                  <Switch
                    checked={model.enabled}
                    onCheckedChange={(enabled) =>
                      onUpdateModel(model.id, { enabled })
                    }
                  />
                  {!defaultModelIds.includes(model.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveModel(model.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Model */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
              Add Custom Model
            </h3>
            <div className="space-y-3">
              <Input
                placeholder="Model name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                className="bg-background"
              />
              <Input
                placeholder="Description (optional)"
                value={newModelDescription}
                onChange={(e) => setNewModelDescription(e.target.value)}
                className="bg-background"
              />
              <Button
                onClick={handleAddModel}
                disabled={!newModelName.trim()}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Model
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg">
            <p>
              <strong>Note:</strong> To persist these settings and enable real AI
              functionality, please connect Lovable Cloud. Currently using demo mode.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
