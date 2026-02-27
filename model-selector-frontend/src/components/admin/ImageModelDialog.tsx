import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { API_ENDPOINTS } from '@/utils/config';

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

const getAuthHeader = (): Record<string, string> => {
    try {
        const raw = localStorage.getItem('jb_static_auth_session');
        if (!raw) return {};
        const parsed = JSON.parse(raw) as any;
        const token = typeof parsed?.token === 'string' ? parsed.token : '';
        if (!token) return {};
        const tokenType = typeof parsed?.token_type === 'string' ? parsed.token_type : 'Bearer';
        return { Authorization: `${tokenType} ${token}`.trim() };
    } catch { return {}; }
};

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
    const [showApiKey, setShowApiKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    /** Fetch existing image config from backend whenever dialog opens */
    useEffect(() => {
        if (!isOpen) return;
        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(API_ENDPOINTS.images.getConfig(), {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                        'Cache-Control': 'no-cache',
                        ...getAuthHeader()
                    },
                    credentials: 'include',
                });
                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                if (!data) return;
                // Extract only the fields this dialog needs; ignore the rest
                setConfig({
                    model: data.IMAGE_GENERATION_MODEL ?? data.model ?? '',
                    imageSize: data.IMAGE_SIZE ?? data.imageSize ?? '',
                    imageGenerationEngine: data.IMAGE_GENERATION_ENGINE ?? data.imageGenerationEngine ?? '',
                    openAIBaseUrl: data.IMAGES_OPENAI_API_BASE_URL ?? data.openAIBaseUrl ?? '',
                    openAIKey: data.IMAGES_OPENAI_API_KEY ?? data.openAIKey ?? '',
                    openAIVersion: data.IMAGES_OPENAI_API_VERSION ?? data.openAIVersion ?? '',
                    additionalParams: data.IMAGES_OPENAI_API_PARAMS
                        ? JSON.stringify(data.IMAGES_OPENAI_API_PARAMS, null, 2)
                        : (data.additionalParams ?? ''),
                });
            } catch (err) {
                console.warn('[ImageModelDialog] Could not load saved config:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('jb_image_config', JSON.stringify(config));
        onSave(config);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[600px] bg-zinc-950 border-white/10 text-white backdrop-blur-xl max-h-[90vh] overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
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
                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="text-xs text-zinc-400 italic text-center animate-pulse">
                            Loading saved configuration...
                        </div>
                    )}
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
