import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ModelSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  suggestedModel: string;
  reason: string;
}

export function ModelSuggestionDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  suggestedModel,
  reason,
}: ModelSuggestionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Switch Model?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {reason}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onCancel}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Continue with current model
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Switch to {suggestedModel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
