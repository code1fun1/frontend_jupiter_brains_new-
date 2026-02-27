import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ModelAlternative {
  id: string;
  name: string;
  recommended_for: string;
}

interface ModelSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (modelId: string) => void;
  onCancel: () => void;
  suggestedModel: string;
  reason: string;
  alternatives?: ModelAlternative[];
}

export function ModelSuggestionDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  suggestedModel,
  reason,
  alternatives = [],
}: ModelSuggestionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#1a1a1a] border-gray-700 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl font-semibold">
            Switch Model?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 pt-3 text-base leading-relaxed">
            {reason}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 mt-4">
          <p className="text-sm text-gray-400 font-medium">Recommended Model:</p>
          <button
            onClick={() => onConfirm(suggestedModel)}
            className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-white border border-purple-500 py-4 px-4 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">{suggestedModel}</div>
              <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded">
                Recommended
              </span>
            </div>
          </button>
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            onClick={onCancel}
            className="w-full bg-transparent text-gray-300 hover:bg-white/10 hover:text-white border border-gray-600 mt-0 py-3 text-base rounded-lg"
          >
            Continue with current model
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
