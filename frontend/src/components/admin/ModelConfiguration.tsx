import { useEffect, useState } from 'react';
import { Trash2, GripVertical, Settings2, ExternalLink, Pencil, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AIModel } from '@/types/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getBackendBaseUrl, API_ENDPOINTS } from '@/utils/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageModelDialog, ImageModelConfig } from './ImageModelDialog';
import { VideoModelDialog, VideoModelConfig } from './VideoModelDialog';

interface ModelConfigurationProps {
  models: AIModel[];
  onUpdateModel: (modelId: string, updates: Partial<AIModel>) => void;
  onRemoveModel: (modelId: string) => void;
  onRefreshModels?: () => Promise<void> | void;
}

export function ModelConfiguration({
  models,
  onUpdateModel,
  onRemoveModel,
  onRefreshModels,
}: ModelConfigurationProps) {
  const [openAIOverview, setOpenAIOverview] = useState<any | null>(null);
  const [enableOpenAI, setEnableOpenAI] = useState(true);
  const [openAIBaseUrlsText, setOpenAIBaseUrlsText] = useState('');
  const [openAIKeysText, setOpenAIKeysText] = useState('');
  const [openAIConfigsJson, setOpenAIConfigsJson] = useState('{\n  \n}');
  const [openAIModelId, setOpenAIModelId] = useState('');
  const [openAIModelIds, setOpenAIModelIds] = useState<string[]>([]);
  const [isAddingModelId, setIsAddingModelId] = useState(false);
  const [isSavingOpenAIConfig, setIsSavingOpenAIConfig] = useState(false);
  const [isImageModelDialogOpen, setIsImageModelDialogOpen] = useState(false);
  const [isVideoModelDialogOpen, setIsVideoModelDialogOpen] = useState(false);

  const getOverviewStorageKey = () => {
    try {
      const rawUser = localStorage.getItem('jb_static_auth');
      const parsed = rawUser ? (JSON.parse(rawUser) as any) : null;
      const email = typeof parsed?.email === 'string' ? parsed.email.trim().toLowerCase() : '';
      return email ? `jb_openai_config_overview:${email}` : 'jb_openai_config_overview';
    } catch {
      return 'jb_openai_config_overview';
    }
  };

  const readOverviewFromStorage = () => {
    try {
      const raw = localStorage.getItem(getOverviewStorageKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const saved = readOverviewFromStorage();
    if (saved) setOpenAIOverview(saved);
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => {
      setOpenAIOverview(readOverviewFromStorage());
    };

    window.addEventListener('jb-auth-changed', handleAuthChanged);
    window.addEventListener('storage', handleAuthChanged);

    return () => {
      window.removeEventListener('jb-auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleAuthChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const configUrl = API_ENDPOINTS.openai.config();

        const res = await fetch(configUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...getStoredAuthHeader(),
          },
          credentials: 'include',
        });

        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data) return;

        const d: any = data as any;
        const overview = d?.data && typeof d.data === 'object' ? d.data : d;
        if (!overview || typeof overview !== 'object') return;

        setOpenAIOverview(overview);
        try {
          localStorage.setItem(getOverviewStorageKey(), JSON.stringify(overview));
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maskKey = (key: string) => {
    const k = String(key || '').trim();
    if (!k) return '';
    if (k.length <= 8) return `${k.slice(0, 2)}****${k.slice(-2)}`;
    return `${k.slice(0, 4)}****${k.slice(-4)}`;
  };

  const applyOverviewToForm = () => {
    const s: any = openAIOverview;
    if (!s) return;

    if (typeof s?.ENABLE_OPENAI_API === 'boolean') setEnableOpenAI(s.ENABLE_OPENAI_API);
    if (Array.isArray(s?.OPENAI_API_BASE_URLS)) setOpenAIBaseUrlsText(s.OPENAI_API_BASE_URLS.join('\n'));
    if (Array.isArray(s?.OPENAI_API_KEYS)) setOpenAIKeysText(s.OPENAI_API_KEYS.join('\n'));
    if (s?.OPENAI_API_CONFIGS && typeof s.OPENAI_API_CONFIGS === 'object') {
      setOpenAIConfigsJson(JSON.stringify(s.OPENAI_API_CONFIGS, null, 2));
    }

    toast.success('Loaded saved config into editor');
  };

  const getStoredAuthHeader = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem('jb_static_auth_session');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as any;
      const token = typeof parsed?.token === 'string' ? parsed.token : '';
      if (!token) return {};
      const tokenType = typeof parsed?.token_type === 'string' ? parsed.token_type : 'Bearer';
      return { Authorization: `${tokenType} ${token}`.trim() };
    } catch {
      return {};
    }
  };

  const parseList = (text: string): string[] => {
    return text
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleAddModelId = async () => {
    const trimmed = openAIModelId.trim();
    if (!trimmed) return;

    const updatedIds = [...openAIModelIds, trimmed];

    setIsAddingModelId(true);
    try {
      const bearerHeader = getStoredAuthHeader();
      const payload = {
        ENABLE_OPENAI_API: enableOpenAI,
        OPENAI_API_BASE_URLS: parseList(openAIBaseUrlsText),
        OPENAI_API_KEYS: parseList(openAIKeysText),
        OPENAI_API_CONFIGS: {
          '0': {
            enable: true,
            tags: [],
            prefix_id: '',
            model_ids: updatedIds,
            connection_type: 'external',
            auth_type: 'bearer',
          },
        },
      };

      const res = await fetch(API_ENDPOINTS.openai.updateConfig(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...bearerHeader },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      setOpenAIModelIds(updatedIds);
      setOpenAIModelId('');
      toast.success(`Model ID "${trimmed}" added!`);
    } catch (e: any) {
      toast.error(`Failed to add model ID: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsAddingModelId(false);
    }
  };

  const handleRemoveModelId = async (idToRemove: string) => {
    const updatedIds = openAIModelIds.filter((id) => id !== idToRemove);
    try {
      const bearerHeader = getStoredAuthHeader();
      const payload = {
        ENABLE_OPENAI_API: enableOpenAI,
        OPENAI_API_BASE_URLS: parseList(openAIBaseUrlsText),
        OPENAI_API_KEYS: parseList(openAIKeysText),
        OPENAI_API_CONFIGS: {
          '0': {
            enable: true,
            tags: [],
            prefix_id: '',
            model_ids: updatedIds,
            connection_type: 'external',
            auth_type: 'bearer',
          },
        },
      };
      await fetch(API_ENDPOINTS.openai.updateConfig(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...bearerHeader },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      setOpenAIModelIds(updatedIds);
      toast.success(`Model ID removed`);
    } catch {
      toast.error('Failed to remove model ID');
    }
  };

  const handleSaveOpenAIConfig = async () => {
    let configs: any = {};
    try {
      const trimmed = openAIConfigsJson.trim();
      configs = trimmed ? JSON.parse(trimmed) : {};
    } catch {
      toast.error('OPENAI_API_CONFIGS must be valid JSON');
      return;
    }

    // If model IDs were added via the + button, use the structured format.
    // Otherwise fall back to the JSON textarea value.
    const openAIConfigs = openAIModelIds.length > 0
      ? {
        '0': {
          enable: true,
          tags: [],
          prefix_id: '',
          model_ids: openAIModelIds,
          connection_type: 'external',
          auth_type: 'bearer',
        },
      }
      : (configs && typeof configs === 'object' ? configs : {});

    const payload = {
      ENABLE_OPENAI_API: enableOpenAI,
      OPENAI_API_BASE_URLS: parseList(openAIBaseUrlsText),
      OPENAI_API_KEYS: parseList(openAIKeysText),
      OPENAI_API_CONFIGS: openAIConfigs,
      OPENAI_API_MODEL: openAIModelId.trim() || undefined,
    };

    setIsSavingOpenAIConfig(true);
    try {
      const updateConfigUrl = API_ENDPOINTS.openai.updateConfig();

      const res = await fetch(updateConfigUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getStoredAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          typeof data?.detail === 'string'
            ? data.detail
            : typeof data?.message === 'string'
              ? data.message
              : `Failed to update OpenAI config (HTTP ${res.status})`;
        toast.error(message);
        return;
      }

      try {
        localStorage.setItem(getOverviewStorageKey(), JSON.stringify(payload));
      } catch {
        // ignore persistence failures
      }

      setOpenAIOverview(payload);

      toast.success('OpenAI config updated successfully');

      if (onRefreshModels) {
        try {
          await onRefreshModels();
        } catch {
          // ignore refresh errors
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update OpenAI config');
    } finally {
      setIsSavingOpenAIConfig(false);
    }
  };

  const defaultModelIds = ['jupiterbrains', 'chatgpt', 'claude', 'gemini', 'random'];

  const handleModelToggle = async (model: AIModel, enabled: boolean) => {
    // Update UI state immediately
    onUpdateModel(model.id, { enabled });

    try {
      const rawData = model.rawData;
      if (!rawData) {
        toast.error('Model data not available');
        return;
      }

      // Check if model exists in database
      let modelExistsInDB = false;
      try {
        const checkRes = await fetch(API_ENDPOINTS.models.base(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...getStoredAuthHeader(),
          },
          credentials: 'include',
        });

        if (checkRes.ok) {
          const existingModels = await checkRes.json();
          modelExistsInDB = existingModels.some((m: any) => m.id === (rawData.id || model.id));
        }
      } catch (err) {
        console.warn('Failed to check model existence:', err);
      }

      // Choose API based on existence
      const apiUrl = modelExistsInDB ? API_ENDPOINTS.models.update() : API_ENDPOINTS.models.create();
      console.log(`Toggle: "${model.name}" exists=${modelExistsInDB}, using ${modelExistsInDB ? 'UPDATE' : 'CREATE'}`);

      // Build payload
      const basePayload = {
        id: rawData.id || model.id,
        name: rawData.name || model.name,
        base_model_id: rawData.base_model_id || null,
        params: rawData.params || {},
        meta: {
          profile_image_url: rawData.meta?.profile_image_url || rawData.profile_image_url || '/static/favicon.png',
          description: rawData.meta?.description || rawData.description || null,
          capabilities: rawData.meta?.capabilities || rawData.capabilities || {
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
          suggestion_prompts: rawData.meta?.suggestion_prompts || rawData.suggestion_prompts || null,
          tags: rawData.meta?.tags || rawData.tags || [],
        },
        is_active: true,
        active: true,
        connection_type: rawData.connection_type || 'external',
        context_window: rawData.context_window || 4096,
        max_completion_tokens: rawData.max_completion_tokens || 4096,
        created: rawData.created || Math.floor(Date.now() / 1000),
        object: rawData.object || 'model',
        owned_by: rawData.owned_by || rawData.openai?.owned_by || 'openai',
        public_apps: rawData.public_apps || null,
        urlIdx: rawData.urlIdx || 0,
        openai: rawData.openai || {
          id: rawData.id || model.id,
          object: 'model',
          created: rawData.created || Math.floor(Date.now() / 1000),
          owned_by: rawData.owned_by || 'openai',
          active: true,
          connection_type: rawData.connection_type || 'external',
          context_window: rawData.context_window || 4096,
          max_completion_tokens: rawData.max_completion_tokens || 4096,
        },
      };

      const payload = enabled
        ? { ...basePayload, access_control: null }
        : {
          ...basePayload,
          access_control: {
            read: { group_ids: [], user_ids: [] },
            write: { group_ids: [], user_ids: [] },
          },
        };

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...getStoredAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.detail || data?.message || `Failed (HTTP ${res.status})`;
        toast.error(message);
        return;
      }

      toast.success(`"${model.name}" ${enabled ? 'enabled (public)' : 'disabled (private)'}!`);

      // Refresh models to sync with backend
      if (onRefreshModels) await onRefreshModels();

      // Then update model's rawData with the enriched payload we just sent
      // This ensures the model has 'meta' and 'access_control' fields locally
      // and overwrites any basic data from the refresh
      onUpdateModel(model.id, {
        enabled,
        rawData: {
          ...model.rawData,
          ...payload,
        },
      });
    } catch (err: any) {
      console.error('Toggle error:', err);
      toast.error(err?.message || 'Failed to toggle model');
    }
  };

  const handleSaveImageConfig = async (config: ImageModelConfig) => {
    try {
      // Get auth headers
      const bearerHeader = getStoredAuthHeader();

      // Parse additional params
      let additionalParams = {};
      if (config.additionalParams) {
        try {
          additionalParams = JSON.parse(config.additionalParams);
        } catch (e) {
          console.warn('Invalid JSON in additional params, using empty object');
        }
      }

      // Map form data to backend payload format
      const payload = {
        ENABLE_IMAGE_GENERATION: true,
        ENABLE_IMAGE_PROMPT_GENERATION: true,
        IMAGE_GENERATION_ENGINE: (config.imageGenerationEngine || 'openai').toLowerCase(),
        IMAGE_GENERATION_MODEL: config.model || '',
        IMAGE_SIZE: config.imageSize || '',
        IMAGE_STEPS: 50,
        IMAGES_OPENAI_API_BASE_URL: config.openAIBaseUrl || '',
        IMAGES_OPENAI_API_KEY: config.openAIKey || '',
        IMAGES_OPENAI_API_VERSION: config.openAIVersion || '',
        IMAGES_OPENAI_API_PARAMS: additionalParams,
        AUTOMATIC1111_BASE_URL: '',
        AUTOMATIC1111_API_AUTH: '',
        AUTOMATIC1111_PARAMS: {},
        COMFYUI_BASE_URL: '',
        COMFYUI_API_KEY: '',
        COMFYUI_WORKFLOW: '{\n  "3": {\n    "inputs": {\n      "seed": 0,\n      "steps": 20,\n      "cfg": 8,\n      "sampler_name": "euler",\n      "scheduler": "normal",\n      "denoise": 1,\n      "model": [\n        "4",\n        0\n      ],\n      "positive": [\n        "6",\n        0\n      ],\n      "negative": [\n        "7",\n        0\n      ],\n      "latent_image": [\n        "5",\n        0\n      ]\n    },\n    "class_type": "KSampler",\n    "_meta": {\n      "title": "KSampler"\n    }\n  },\n  "4": {\n    "inputs": {\n      "ckpt_name": "model.safetensors"\n    },\n    "class_type": "CheckpointLoaderSimple",\n    "_meta": {\n      "title": "Load Checkpoint"\n    }\n  },\n  "5": {\n    "inputs": {\n      "width": 512,\n      "height": 512,\n      "batch_size": 1\n    },\n    "class_type": "EmptyLatentImage",\n    "_meta": {\n      "title": "Empty Latent Image"\n    }\n  },\n  "6": {\n    "inputs": {\n      "text": "Prompt",\n      "clip": [\n        "4",\n        1\n      ]\n    },\n    "class_type": "CLIPTextEncode",\n    "_meta": {\n      "title": "CLIP Text Encode (Prompt)"\n    }\n  },\n  "7": {\n    "inputs": {\n      "text": "",\n      "clip": [\n        "4",\n        1\n      ]\n    },\n    "class_type": "CLIPTextEncode",\n    "_meta": {\n      "title": "CLIP Text Encode (Prompt)"\n    }\n  },\n  "8": {\n    "inputs": {\n      "samples": [\n        "3",\n        0\n      ],\n      "vae": [\n        "4",\n        2\n      ]\n    },\n    "class_type": "VAEDecode",\n    "_meta": {\n      "title": "VAE Decode"\n    }\n  },\n  "9": {\n    "inputs": {\n      "filename_prefix": "ComfyUI",\n      "images": [\n        "8",\n        0\n      ]\n    },\n    "class_type": "SaveImage",\n    "_meta": {\n      "title": "Save Image"\n    }\n  }\n}',
        COMFYUI_WORKFLOW_NODES: [
          { type: 'prompt', key: 'text', node_ids: [] },
          { type: 'model', key: 'ckpt_name', node_ids: [] },
          { type: 'width', key: 'width', node_ids: [] },
          { type: 'height', key: 'height', node_ids: [] },
          { type: 'steps', key: 'steps', node_ids: [] },
          { type: 'seed', key: 'seed', node_ids: [] },
        ],
        IMAGES_GEMINI_API_BASE_URL: '',
        IMAGES_GEMINI_API_KEY: '',
        IMAGES_GEMINI_ENDPOINT_METHOD: '',
        ENABLE_IMAGE_EDIT: false,
        IMAGE_EDIT_ENGINE: 'openai',
        IMAGE_EDIT_MODEL: '',
        IMAGE_EDIT_SIZE: '',
        IMAGES_EDIT_OPENAI_API_BASE_URL: 'https://api.openai.com/v1',
        IMAGES_EDIT_OPENAI_API_KEY: '',
        IMAGES_EDIT_OPENAI_API_VERSION: '',
        IMAGES_EDIT_GEMINI_API_BASE_URL: '',
        IMAGES_EDIT_GEMINI_API_KEY: '',
        IMAGES_EDIT_COMFYUI_BASE_URL: '',
        IMAGES_EDIT_COMFYUI_API_KEY: '',
        IMAGES_EDIT_COMFYUI_WORKFLOW: '',
        IMAGES_EDIT_COMFYUI_WORKFLOW_NODES: [],
      };

      // POST request to update image config
      const response = await fetch(API_ENDPOINTS.images.updateConfig(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...bearerHeader,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update image configuration');
      }

      const result = await response.json();
      console.log('Image config updated:', result);

      // Trigger GET requests to refresh data
      await Promise.all([
        fetch(API_ENDPOINTS.images.config(), {
          method: 'GET',
          headers: { ...bearerHeader },
          credentials: 'include',
        }),
        fetch(API_ENDPOINTS.images.models(), {
          method: 'GET',
          headers: { ...bearerHeader },
          credentials: 'include',
        }),
      ]);

      toast.success('Image model configuration saved successfully!');
    } catch (error) {
      console.error('Error saving image config:', error);
      toast.error('Failed to save image configuration');
    }
  };

  const handleSaveVideoConfig = (config: VideoModelConfig) => {
    // No API connection yet — config is saved locally for future use
    console.log('[VideoModelDialog] Config saved (no API wired yet):', config);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Models</h2>
          <p className="text-zinc-400 text-sm">Manage the intelligence of your assistant</p>
        </div>

        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-zinc-200 transition-all font-semibold gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Settings2 className="h-4 w-4" />
                Connect OpenAI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-white/10 text-white backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  OpenAI Configuration
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Update connection settings for OpenAI-compatible backends
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {openAIOverview && (
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Current Setup</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={applyOverviewToForm}
                        className="text-xs h-7 hover:bg-white/5 hover:text-white"
                      >
                        Reset to Saved
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="text-zinc-500">API Status</div>
                        <div className="font-mono text-zinc-300 flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${openAIOverview?.ENABLE_OPENAI_API ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          {openAIOverview?.ENABLE_OPENAI_API ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-zinc-500">Endpoints</div>
                        <div className="font-mono text-zinc-300 truncate">
                          {Array.isArray(openAIOverview?.OPENAI_API_BASE_URLS)
                            ? openAIOverview.OPENAI_API_BASE_URLS[0] || 'N/A'
                            : 'N/A'}
                          {Array.isArray(openAIOverview?.OPENAI_API_BASE_URLS) && openAIOverview.OPENAI_API_BASE_URLS.length > 1 && ` (+${openAIOverview.OPENAI_API_BASE_URLS.length - 1} more)`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm">Enabled Gateway</div>
                    <div className="text-xs text-zinc-500">Allow AI traffic through this provider</div>
                  </div>
                  <Switch checked={enableOpenAI} onCheckedChange={setEnableOpenAI} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-base-urls" className="text-zinc-400 text-xs uppercase tracking-wider ml-1">Base URLs</Label>
                  <Textarea
                    id="openai-base-urls"
                    placeholder="https://api.openai.com/v1"
                    value={openAIBaseUrlsText}
                    onChange={(e) => setOpenAIBaseUrlsText(e.target.value)}
                    className="bg-black/50 border-white/5 focus:border-purple-500/50 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-keys" className="text-zinc-400 text-xs uppercase tracking-wider ml-1">API Keys</Label>
                  <Textarea
                    id="openai-keys"
                    placeholder="sk-..."
                    value={openAIKeysText}
                    onChange={(e) => setOpenAIKeysText(e.target.value)}
                    className="bg-black/50 border-white/5 focus:border-purple-500/50 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider ml-1">Model IDs</Label>

                  {/* Existing model IDs list */}
                  {openAIModelIds.length > 0 && (
                    <div className="space-y-1.5">
                      {openAIModelIds.map((id) => (
                        <div key={id} className="flex items-center justify-between gap-2 px-3 py-2 bg-black/40 border border-white/5 rounded-md">
                          <span className="text-sm text-zinc-200 font-mono truncate flex-1">{id}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveModelId(id)}
                            className="text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                            title="Remove"
                          >
                            −
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add model ID row */}
                  <div className="flex items-center gap-2">
                    <input
                      id="openai-model-id"
                      type="text"
                      placeholder="Add a model ID"
                      value={openAIModelId}
                      onChange={(e) => setOpenAIModelId(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddModelId(); } }}
                      className="flex-1 rounded-md px-3 py-2 text-sm bg-black/50 border border-white/5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddModelId}
                      disabled={isAddingModelId || !openAIModelId.trim()}
                      title="Add model ID"
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                    >
                      {isAddingModelId ? '…' : '+'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openai-configs" className="text-zinc-400 text-xs uppercase tracking-wider ml-1">Advanced Config (JSON)</Label>
                  <Textarea
                    id="openai-configs"
                    placeholder='{}'
                    value={openAIConfigsJson}
                    onChange={(e) => setOpenAIConfigsJson(e.target.value)}
                    className="bg-black/50 border-white/5 focus:border-purple-500/50 min-h-[120px] font-mono text-xs"
                  />
                </div>

                <Button
                  onClick={handleSaveOpenAIConfig}
                  disabled={isSavingOpenAIConfig}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-11 shadow-[0_4px_15px_rgba(255,255,255,0.1)] transition-all"
                >
                  {isSavingOpenAIConfig ? 'Synchronizing...' : 'Update Configuration'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={() => setIsImageModelDialogOpen(true)}
            className="bg-white text-black hover:bg-zinc-200 transition-all font-semibold gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            <Image className="h-4 w-4" />
            Enable Image Models
          </Button>

          <Button
            onClick={() => setIsVideoModelDialogOpen(true)}
            className="bg-violet-600 text-white hover:bg-violet-500 transition-all font-semibold gap-2 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            <Video className="h-4 w-4" />
            Enable Video Models
          </Button>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white">Available Models</CardTitle>
          <CardDescription className="text-zinc-400">Configure visible intelligence options for users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-6 pb-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {model.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {model.description}
                </div>
              </div>
              <Switch
                checked={model.enabled}
                onCheckedChange={(enabled) =>
                  handleModelToggle(model, enabled)
                }
              />

              {!defaultModelIds.includes(model.id) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveModel(model.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>


      <div className="text-[10px] text-zinc-600 bg-white/5 p-4 rounded-xl border border-white/5 uppercase tracking-[0.2em] text-center">
        Secure Model Management &bull; Enterprise Protocol v2.1
      </div>

      {/* Image Model Configuration Dialog */}
      <ImageModelDialog
        isOpen={isImageModelDialogOpen}
        onClose={() => setIsImageModelDialogOpen(false)}
        onSave={handleSaveImageConfig}
      />

      {/* Video Model Configuration Dialog */}
      <VideoModelDialog
        isOpen={isVideoModelDialogOpen}
        onClose={() => setIsVideoModelDialogOpen(false)}
        onSave={handleSaveVideoConfig}
      />
    </div>
  );
}
