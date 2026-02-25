import { useState } from 'react';
import { Image, Eye, EyeOff } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
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
    enabled: boolean;
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
        enabled: true,
        model: '',
        imageSize: '',
        imageGenerationEngine: '',
        openAIBaseUrl: '',
        openAIKey: '',
        openAIVersion: '',
        additionalParams: '',
    });
    const [showApiKey, setShowApiKey] = useState(false);

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
                    {/* General Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 border-b border-white/10 pb-2">
                            General
                        </h3>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex flex-col">
                                <Label htmlFor="img-gen-toggle" className="text-sm font-medium text-white cursor-pointer">
                                    Image Generation
                                </Label>
                                <span className="text-xs text-zinc-500 mt-0.5">Enable image generation for users</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.enabled
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}>
                                    {config.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <Switch
                                    id="img-gen-toggle"
                                    checked={config.enabled}
                                    onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
                                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500/60"
                                />
                            </div>
                        </div>
                    </div>

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
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? 'text' : 'password'}
                                    value={config.openAIKey}
                                    onChange={(e) => setConfig({ ...config, openAIKey: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 pr-10"
                                    placeholder="sk-..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
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
