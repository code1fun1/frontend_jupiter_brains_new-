import { useState } from 'react';
import { Video, Eye, EyeOff } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/utils/config';

export interface VideoModelConfig {
    enabled: boolean;
    model: string;
    videoGenerationEngine: string;
    replicateApiBaseUrl: string;
    replicateApiKey: string;
    openAIVideoApiBaseUrl: string;
    openAIVideoApiKey: string;
    openAIVideoApiVersion: string;
    openAIVideoGenerationEndpoint: string;
    pollingInterval: number;
    timeout: number;
}

interface VideoModelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: VideoModelConfig) => void;
}

export function VideoModelDialog({ isOpen, onClose, onSave }: VideoModelDialogProps) {
    const [config, setConfig] = useState<VideoModelConfig>({
        enabled: true,
        model: 'minimax/video-01:5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912',
        videoGenerationEngine: 'replicate',
        replicateApiBaseUrl: 'https://api.replicate.com/v1',
        replicateApiKey: '',
        openAIVideoApiBaseUrl: 'https://api.openai.com/v1',
        openAIVideoApiKey: '',
        openAIVideoApiVersion: '',
        openAIVideoGenerationEndpoint: '/video/generations',
        pollingInterval: 5,
        timeout: 600,
    });
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Build the payload dynamically from form values
            const payload = {
                ENABLE_VIDEO_GENERATION: config.enabled,
                VIDEO_GENERATION_ENGINE: config.videoGenerationEngine,
                VIDEO_GENERATION_MODEL: config.model,
                REPLICATE_API_BASE_URL: config.replicateApiBaseUrl,
                REPLICATE_API_KEY: config.replicateApiKey,
                OPENAI_VIDEO_API_BASE_URL: config.openAIVideoApiBaseUrl,
                OPENAI_VIDEO_API_KEY: config.openAIVideoApiKey,
                OPENAI_VIDEO_API_VERSION: config.openAIVideoApiVersion || null,
                OPENAI_VIDEO_GENERATION_ENDPOINT: config.openAIVideoGenerationEndpoint,
                VIDEO_POLL_INTERVAL_SECONDS: config.pollingInterval,
                VIDEO_TIMEOUT_SECONDS: config.timeout,
            };

            console.log('[VideoModelDialog] Sending payload to API:', payload);

            const response = await fetch(API_ENDPOINTS.video.updateConfig(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => null);
                const detail = err?.detail || err?.message || `HTTP ${response.status}`;
                throw new Error(detail);
            }

            const result = await response.json().catch(() => ({}));
            console.log('[VideoModelDialog] API response:', result);

            toast.success('Video model configuration saved successfully!');
            onSave(config);
            onClose();
        } catch (error: any) {
            console.error('[VideoModelDialog] Save failed:', error);
            toast.error(`Failed to save video config: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-white/10 text-white backdrop-blur-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                        <Video className="h-5 w-5 text-violet-400" />
                        Video Model Configuration
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Configure video generation models and settings
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
                                <Label htmlFor="video-gen-toggle" className="text-sm font-medium text-white cursor-pointer">
                                    Video Generation
                                </Label>
                                <span className="text-xs text-zinc-500 mt-0.5">Enable video generation for users</span>
                            </div>
                            <Switch
                                id="video-gen-toggle"
                                checked={config.enabled}
                                onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
                                className="data-[state=checked]:bg-violet-500"
                            />
                        </div>
                    </div>

                    {/* Create Video Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 border-b border-white/10 pb-2">
                            Create Video
                        </h3>

                        {/* Model */}
                        <div className="space-y-2">
                            <Label htmlFor="video-model" className="text-sm text-zinc-300">Model</Label>
                            <Input
                                id="video-model"
                                value={config.model}
                                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="e.g., minimax/video-01:5aa835260ff7f40f"
                            />
                        </div>

                        {/* Video Generation Engine */}
                        <div className="space-y-2">
                            <Label htmlFor="video-engine" className="text-sm text-zinc-300">Video Generation Engine</Label>
                            <Select
                                value={config.videoGenerationEngine}
                                onValueChange={(value) => setConfig({ ...config, videoGenerationEngine: value })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white" id="video-engine">
                                    <SelectValue placeholder="Select engine" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    <SelectItem value="replicate">Replicate</SelectItem>
                                    <SelectItem value="runpod">RunPod</SelectItem>
                                    <SelectItem value="fal">fal.ai</SelectItem>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Replicate API Base URL */}
                        <div className="space-y-2">
                            <Label htmlFor="replicate-base-url" className="text-sm text-zinc-300">Replicate API Base URL</Label>
                            <Input
                                id="replicate-base-url"
                                value={config.replicateApiBaseUrl}
                                onChange={(e) => setConfig({ ...config, replicateApiBaseUrl: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="https://api.replicate.com/v1"
                            />
                        </div>

                        {/* Replicate API Key */}
                        <div className="space-y-2">
                            <Label htmlFor="replicate-api-key" className="text-sm text-zinc-300">Replicate API Key</Label>
                            <div className="relative">
                                <Input
                                    id="replicate-api-key"
                                    type={showApiKey ? 'text' : 'password'}
                                    value={config.replicateApiKey}
                                    onChange={(e) => setConfig({ ...config, replicateApiKey: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 pr-10"
                                    placeholder="r8_..."
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

                        {/* Polling Interval */}
                        <div className="space-y-2">
                            <Label htmlFor="polling-interval" className="text-sm text-zinc-300">Polling Interval (seconds)</Label>
                            <Input
                                id="polling-interval"
                                type="number"
                                min={1}
                                value={config.pollingInterval}
                                onChange={(e) => setConfig({ ...config, pollingInterval: Number(e.target.value) })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="5"
                            />
                        </div>

                        {/* Timeout */}
                        <div className="space-y-2">
                            <Label htmlFor="timeout" className="text-sm text-zinc-300">Timeout (seconds)</Label>
                            <Input
                                id="timeout"
                                type="number"
                                min={10}
                                value={config.timeout}
                                onChange={(e) => setConfig({ ...config, timeout: Number(e.target.value) })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="600"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
