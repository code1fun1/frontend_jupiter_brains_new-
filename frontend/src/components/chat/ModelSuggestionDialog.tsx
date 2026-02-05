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
      <AlertDialogContent className="bg-[#1a1a1a] border-gray-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl font-semibold">
            Switch Model?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 pt-3 text-base leading-relaxed">
            {reason}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-3 sm:gap-3 mt-4">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3 text-base order-first rounded-lg"
          >
            Switch to {suggestedModel}
          </AlertDialogAction>
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
