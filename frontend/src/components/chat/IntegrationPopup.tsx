import { Image, Video } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface IntegrationPopupProps {
    isOpen: boolean;
    onClose: () => void;
    imageGenerationEnabled: boolean;
    onImageGenerationToggle: (enabled: boolean) => void;
    videoGenerationEnabled: boolean;
    onVideoGenerationToggle: (enabled: boolean) => void;
}

export function IntegrationPopup({
    isOpen,
    onClose,
    imageGenerationEnabled,
    onImageGenerationToggle,
    videoGenerationEnabled,
    onVideoGenerationToggle,
}: IntegrationPopupProps) {
    if (!isOpen) return null;

    const handleImageToggle = (enabled: boolean) => {
        onImageGenerationToggle(enabled);
        if (enabled) onVideoGenerationToggle(false); // mutually exclusive
    };

    const handleVideoToggle = (enabled: boolean) => {
        onVideoGenerationToggle(enabled);
        if (enabled) onImageGenerationToggle(false); // mutually exclusive
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={onClose} />

            {/* Popup */}
            <div className="absolute bottom-12 left-0 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl">
                <div className="p-4 space-y-1">
                    {/* Header */}
                    <div className="text-sm font-semibold text-foreground border-b border-border pb-3 mb-2">
                        Integrations
                    </div>

                    {/* Image Generation Toggle */}
                    <div className="flex items-center justify-between py-2 px-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Image className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <Label htmlFor="image-gen" className="text-sm font-medium text-foreground cursor-pointer">
                                    Image Generation
                                </Label>
                                <span className="text-xs text-muted-foreground">Generate images from text</span>
                            </div>
                        </div>
                        <Switch
                            id="image-gen"
                            checked={imageGenerationEnabled}
                            onCheckedChange={handleImageToggle}
                        />
                    </div>

                    {/* Video Generation Toggle */}
                    <div className="flex items-center justify-between py-2 px-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 rounded-lg">
                                <Video className="h-4 w-4 text-violet-400" />
                            </div>
                            <div className="flex flex-col">
                                <Label htmlFor="video-gen" className="text-sm font-medium text-foreground cursor-pointer">
                                    Video Generation
                                </Label>
                                <span className="text-xs text-muted-foreground">Generate videos from text</span>
                            </div>
                        </div>
                        <Switch
                            id="video-gen"
                            checked={videoGenerationEnabled}
                            onCheckedChange={handleVideoToggle}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
