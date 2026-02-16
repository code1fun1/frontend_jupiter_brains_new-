import { useState } from 'react';
import { Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ImageModelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ImageModelConfig) => void;
}

export interface ImageModelConfig {
    model: string;
    imageSize: string;
    imageGenerationEngine: string;
    openAIBaseUrl: string;
    openAIKey: string;
    openAIVersion: string;
    additionalParams: string;
}

export function ImageModelDialog({ isOpen, onClose, onSave }: ImageModelDialogProps) {
    const [config, setConfig] = useState<ImageModelConfig>({
        model: '',
        imageSize: '',
        imageGenerationEngine: '',
        openAIBaseUrl: '',
        openAIKey: '',
        openAIVersion: '',
        additionalParams: '',
    });

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-white/10 text-white backdrop-blur-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                        <Image className="h-5 w-5 text-white" />
                        Image Model Configuration
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Configure image generation models and settings
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Create Image Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 border-b border-white/10 pb-2">
                            Create Image
                        </h3>

                        {/* Model */}
                        <div className="space-y-2">
                            <Label htmlFor="model" className="text-sm text-zinc-300">
                                Model
                            </Label>
                            <Input
                                id="model"
                                value={config.model}
                                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="e.g., gpt-image-1"
                            />
                        </div>

                        {/* Image Size */}
                        <div className="space-y-2">
                            <Label htmlFor="imageSize" className="text-sm text-zinc-300">
                                Image Size
                            </Label>
                            <Input
                                id="imageSize"
                                value={config.imageSize}
                                onChange={(e) => setConfig({ ...config, imageSize: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="e.g., 512x512"
                            />
                        </div>

                        {/* Image Generation Engine */}
                        <div className="space-y-2">
                            <Label htmlFor="engine" className="text-sm text-zinc-300">
                                Image Generation Engine
                            </Label>
                            <Select
                                value={config.imageGenerationEngine}
                                onValueChange={(value) => setConfig({ ...config, imageGenerationEngine: value })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Select engine" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* OpenAI Base URL */}
                        <div className="space-y-2">
                            <Label htmlFor="baseUrl" className="text-sm text-zinc-300">
                                OpenAI Base URL
                            </Label>
                            <Input
                                id="baseUrl"
                                value={config.openAIBaseUrl}
                                onChange={(e) => setConfig({ ...config, openAIBaseUrl: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="https://api.openai.com/v1"
                            />
                        </div>

                        {/* OpenAI Key */}
                        <div className="space-y-2">
                            <Label htmlFor="apiKey" className="text-sm text-zinc-300">
                                OpenAI API Key
                            </Label>
                            <Input
                                id="apiKey"
                                type="password"
                                value={config.openAIKey}
                                onChange={(e) => setConfig({ ...config, openAIKey: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="sk-..."
                            />
                        </div>

                        {/* OpenAI Version */}
                        <div className="space-y-2">
                            <Label htmlFor="version" className="text-sm text-zinc-300">
                                OpenAI API Version
                            </Label>
                            <Input
                                id="version"
                                value={config.openAIVersion}
                                onChange={(e) => setConfig({ ...config, openAIVersion: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="API Version"
                            />
                        </div>

                        {/* Additional Parameters */}
                        <div className="space-y-2">
                            <Label htmlFor="params" className="text-sm text-zinc-300">
                                Additional Parameters
                            </Label>
                            <Textarea
                                id="params"
                                value={config.additionalParams}
                                onChange={(e) => setConfig({ ...config, additionalParams: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 font-mono text-sm min-h-[100px]"
                                placeholder='{\n  \n}'
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex-1 bg-white text-black hover:bg-white/90"
                    >
                        Save Configuration
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
