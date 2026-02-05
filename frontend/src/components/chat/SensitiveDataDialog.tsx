import { AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SensitiveDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchToOnPrem: () => void;
    onContinue: () => void;
    detectedContent?: string;
}

export function SensitiveDataDialog({
    isOpen,
    onClose,
    onSwitchToOnPrem,
    onContinue,
    detectedContent,
}: SensitiveDataDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Switch Model?
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 pt-2">
                        Your message contains sensitive content. For confidential data or video generation,
                        we recommend using the <span className="font-semibold text-white">JupiterBrains On-Premise</span> model
                        to ensure your data stays secure.
                    </DialogDescription>
                </DialogHeader>

                {detectedContent && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <p className="text-xs text-yellow-200/80 mb-1">Detected sensitive content:</p>
                        <p className="text-sm text-yellow-100 font-mono">{detectedContent}</p>
                    </div>
                )}

                <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2">
                    <Button
                        onClick={onSwitchToOnPrem}
                        className="w-full bg-white text-black hover:bg-gray-200 font-medium"
                    >
                        Switch to JupiterBrains (On-Prem)
                    </Button>
                    <Button
                        onClick={onContinue}
                        variant="ghost"
                        className="w-full text-white hover:bg-white/10"
                    >
                        Continue with current model
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
