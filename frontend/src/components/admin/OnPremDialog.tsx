import { useState } from 'react';
import { Server, Eye, EyeOff } from 'lucide-react';
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
import { toast } from 'sonner';

export interface OnPremConfig {
    modelId: string;
    serverModelId: string;
    baseUrl: string;
    apiKey: string;
}

interface OnPremDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: OnPremConfig) => void;
}

export function OnPremDialog({ isOpen, onClose, onSave }: OnPremDialogProps) {
    const [config, setConfig] = useState<OnPremConfig>(() => {
        const saved = localStorage.getItem('jb_onprem_config');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        return {
            modelId: '',
            serverModelId: '',
            baseUrl: '',
            apiKey: '',
        };
    });
    const [showApi, setShowApi] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /** Read stored auth token (same helper used by ModelConfiguration.tsx) */
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

    const handleSave = async () => {
        if (!config.modelId.trim() || !config.baseUrl.trim()) {
            toast.error('Model ID and Base URL are required');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                enabled: true,
                model_id: config.modelId,
                server_model_id: config.serverModelId,
                base_url: config.baseUrl,
                api_key: config.apiKey
            };

            const { API_ENDPOINTS } = await import('@/utils/config');
            const response = await fetch(API_ENDPOINTS.onprem.updateConfig(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeader() },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => null);
                throw new Error(err?.detail || err?.message || `HTTP ${response.status}`);
            }

            // Also create the model so it immediately appears in the selector
            try {
                const createPayload = {
                    id: config.modelId,
                    name: config.modelId,
                    base_model_id: null,
                    params: {},
                    meta: {
                        profile_image_url: '/static/favicon.png',
                        description: 'On-Premise Model',
                        capabilities: {
                            file_context: true,
                            vision: true,
                            file_upload: true,
                            web_search: true,
                            image_generation: true,
                            code_interpreter: true,
                            citations: true,
                            status_updates: true,
                            builtin_tools: true,
                        },
                        suggestion_prompts: null,
                        tags: [],
                    },
                    is_active: true,
                    active: true,
                    connection_type: 'external',
                    context_window: 4096,
                    max_completion_tokens: 4096,
                    created: Math.floor(Date.now() / 1000),
                    object: 'model',
                    owned_by: 'openai',
                    public_apps: null,
                    urlIdx: 0,
                    openai: {
                        id: config.modelId,
                        object: 'model',
                        created: Math.floor(Date.now() / 1000),
                        owned_by: 'openai',
                        active: true,
                        connection_type: 'external',
                        context_window: 4096,
                        max_completion_tokens: 4096,
                    },
                    access_control: null,
                };

                await fetch(API_ENDPOINTS.models.create(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeader() },
                    credentials: 'include',
                    body: JSON.stringify(createPayload),
                });
                console.log('Successfully created model in backend');
            } catch (err) {
                console.error('Failed to auto-create model', err);
            }

            // Persist local copy
            localStorage.setItem('jb_onprem_config', JSON.stringify({ ...config, savedAt: new Date().toISOString() }));

            toast.success('On-Prem configuration saved!');
            onSave(config);
            onClose();
        } catch (err: any) {
            toast.error(`Failed to save: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[520px] bg-zinc-950 border-white/10 text-white backdrop-blur-xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                        <Server className="h-5 w-5 text-emerald-400" />
                        On-Prem Model Configuration
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Configure your self-hosted / on-premise model connection
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Connection Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white/90 border-b border-white/10 pb-2">
                            Connection
                        </h3>

                        {/* Model ID */}
                        <div className="space-y-2">
                            <Label htmlFor="onprem-model-id" className="text-sm text-zinc-300">
                                Model ID
                            </Label>
                            <Input
                                id="onprem-model-id"
                                value={config.modelId}
                                onChange={(e) => setConfig({ ...config, modelId: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="e.g., jupiterbrains-7b"
                            />
                        </div>

                        {/* Server Model ID */}
                        <div className="space-y-2">
                            <Label htmlFor="onprem-server-model-id" className="text-sm text-zinc-300">
                                Server Model ID
                            </Label>
                            <Input
                                id="onprem-server-model-id"
                                value={config.serverModelId}
                                onChange={(e) => setConfig({ ...config, serverModelId: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="e.g., my-server-model"
                            />
                        </div>

                        {/* Base URL */}
                        <div className="space-y-2">
                            <Label htmlFor="onprem-url" className="text-sm text-zinc-300">
                                Base URL
                            </Label>
                            <Input
                                id="onprem-url"
                                value={config.baseUrl}
                                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                                placeholder="e.g., http://localhost:11434/v1"
                            />
                        </div>

                        {/* API Key */}
                        <div className="space-y-2">
                            <Label htmlFor="onprem-api" className="text-sm text-zinc-300">
                                API Key
                            </Label>
                            <div className="relative">
                                <Input
                                    id="onprem-api"
                                    type={showApi ? 'text' : 'password'}
                                    value={config.apiKey}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 pr-10"
                                    placeholder="sk-... or leave blank if not required"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApi(!showApi)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {showApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
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
                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                        {isSaving ? 'Saving...' : 'Save & Update'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
